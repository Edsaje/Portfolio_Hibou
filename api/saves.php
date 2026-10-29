<?php
/**
 * API Cloud Save Souveraine — Sanctuaire du Hibou (Portfolio Quentin Beaud)
 * Sauvegardes multi-consoles (NDS, GBA, PS1, SNES, NES...) synchronisées sur VPS
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Game-Name, X-Save-Type, X-Save-Timestamp');
header('Access-Control-Expose-Headers: X-Save-Date, X-Save-Timestamp, X-Save-Size, X-Save-Game');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Dossier persistant sur le volume Docker
$storageDir = '/var/www/storage/saves';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0755, true);
}
// Repli local si /var/www/storage n'existe pas (développement local)
if (!is_dir($storageDir) || !is_writable($storageDir)) {
    $storageDir = __DIR__ . '/.saves_local';
    if (!is_dir($storageDir)) @mkdir($storageDir, 0755, true);
}

// Clé secrète serveur pour signature HMAC
$secretFile = is_file('/var/www/storage/.secret') ? '/var/www/storage/.secret' : __DIR__ . '/.secret';
function getServerSecret($secretFile) {
    if (file_exists($secretFile)) {
        $secret = trim(@file_get_contents($secretFile));
        if (!empty($secret)) return $secret;
    }
    $secret = bin2hex(random_bytes(32));
    @file_put_contents($secretFile, $secret, LOCK_EX);
    return $secret;
}
$serverSecret = getServerSecret($secretFile);

// Hashes autorisés pour le compte Hibouxe (wg-easy et Caddy)
$allowedHashes = [
    '$2y$12$aFxdy7F1O4Aho.5O3GIdCeFJbkhTgyIjxModeRSv7iI4UL.Re5Ydy', // wg-easy ($2y)
    '$2a$12$aFxdy7F1O4Aho.5O3GIdCeFJbkhTgyIjxModeRSv7iI4UL.Re5Ydy', // wg-easy ($2a)
    '$2y$14$0rbWyca233uu1sp4aXxdTuXw.z/HLc3BWzbK.qjAvPPCRYu5Pn6De', // caddy / monitor ($2y)
    '$2a$14$0rbWyca233uu1sp4aXxdTuXw.z/HLc3BWzbK.qjAvPPCRYu5Pn6De', // caddy / monitor ($2a)
];

// Vérification du token HMAC
function verifyAuthToken($token, $serverSecret) {
    if (empty($token) || strpos($token, '.') === false) return false;
    list($b64, $sig) = explode('.', $token, 2);
    $expected = hash_hmac('sha256', $b64, $serverSecret);
    if (!hash_equals($expected, $sig)) return false;
    $data = json_decode(base64_decode(strtr($b64, '-_', '+/')), true);
    if (!$data || ($data['user'] ?? '') !== 'Hibouxe') return false;
    // Token valide 365 jours
    if (time() - ($data['t'] ?? 0) > 365 * 86400) return false;
    return $data;
}

function generateAuthToken($user, $serverSecret) {
    $payload = [
        'user' => $user,
        't' => time(),
        'nonce' => bin2hex(random_bytes(8))
    ];
    $json = json_encode($payload);
    $b64 = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $b64, $serverSecret);
    return $b64 . '.' . $sig;
}

$action = $_GET['action'] ?? '';

// 1. ROUTE LOGIN
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = trim($input['username'] ?? '');
    $pass = $input['password'] ?? '';

    if (strcasecmp($user, 'Hibouxe') !== 0) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Identifiant inconnu (veuillez saisir "Hibouxe").']);
        exit;
    }

    $verified = false;
    foreach ($allowedHashes as $h) {
        if (password_verify($pass, $h)) {
            $verified = true;
            break;
        }
    }

    if (!$verified) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Mot de passe incorrect.']);
        exit;
    }

    $token = generateAuthToken('Hibouxe', $serverSecret);
    echo json_encode([
        'ok' => true,
        'user' => 'Hibouxe',
        'token' => $token,
        'message' => 'Liaison Céleste avec le VPS établie !'
    ]);
    exit;
}

// Toutes les autres routes requièrent le jeton
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) && function_exists('apache_request_headers')) {
    $reqHeaders = apache_request_headers();
    $authHeader = $reqHeaders['Authorization'] ?? $reqHeaders['authorization'] ?? '';
}
$token = '';
if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
    $token = $matches[1];
} elseif (!empty($_GET['token'])) {
    $token = $_GET['token'];
} elseif (!empty($_SERVER['HTTP_X_ORIGINAL_URI'])) {
    $parts = parse_url($_SERVER['HTTP_X_ORIGINAL_URI']);
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $queryVars);
        if (!empty($queryVars['token'])) $token = $queryVars['token'];
    }
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_URI'])) {
    $parts = parse_url($_SERVER['HTTP_X_FORWARDED_URI']);
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $queryVars);
        if (!empty($queryVars['token'])) $token = $queryVars['token'];
    }
}

$authData = verifyAuthToken($token, $serverSecret);
if (!$authData) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Session expirée ou non autorisée.']);
    exit;
}

if ($action === 'auth_check') {
    http_response_code(200);
    echo json_encode(['ok' => true, 'user' => $authData['user'] ?? 'Hibouxe']);
    exit;
}

function getGameKey($rawName) {
    $clean = trim($rawName);
    if (empty($clean)) return null;
    return md5($clean);
}

// 2. ROUTE SAVE
if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $gameName = '';
    if (!empty($_SERVER['HTTP_X_GAME_NAME'])) {
        $gameName = rawurldecode($_SERVER['HTTP_X_GAME_NAME']);
    } elseif (!empty($_POST['game'])) {
        $gameName = $_POST['game'];
    }
    $saveType = $_SERVER['HTTP_X_SAVE_TYPE'] ?? $_POST['type'] ?? 'state';
    $timestamp = intval($_SERVER['HTTP_X_SAVE_TIMESTAMP'] ?? $_POST['timestamp'] ?? (time() * 1000));

    if (empty($gameName)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nom de jeu manquant.']);
        exit;
    }

    $key = getGameKey($gameName);
    $data = '';

    if (!empty($_FILES['save_file']['tmp_name'])) {
        $data = file_get_contents($_FILES['save_file']['tmp_name']);
    } else {
        $data = file_get_contents('php://input');
    }

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Données de sauvegarde vides.']);
        exit;
    }

    $isSram = ($saveType === 'sram');
    $subExt = $isSram ? '.sram.bin' : '.state.bin';
    $savePath = $storageDir . '/' . $key . $subExt;
    $metaPath = $storageDir . '/' . $key . '.meta.json';

    file_put_contents($savePath, $data, LOCK_EX);

    $meta = file_exists($metaPath) ? json_decode(file_get_contents($metaPath), true) : [
        'game' => $gameName,
        'date' => date('d/m/Y H:i:s'),
        'timestamp' => $timestamp
    ];

    if ($isSram) {
        $meta['has_sram'] = true;
        $meta['sram_size'] = strlen($data);
        $meta['sram_date'] = date('d/m/Y H:i:s');
        $meta['sram_timestamp'] = $timestamp;
        $meta['sram_hash'] = sha1($data);
    } else {
        $meta['has_state'] = true;
        $meta['state_size'] = strlen($data);
        $meta['state_date'] = date('d/m/Y H:i:s');
        $meta['state_timestamp'] = $timestamp;
        $meta['state_hash'] = sha1($data);
    }
    if ($timestamp >= ($meta['timestamp'] ?? 0)) {
        $meta['date'] = date('d/m/Y H:i:s');
        $meta['timestamp'] = $timestamp;
    }
    file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT), LOCK_EX);

    echo json_encode([
        'ok' => true,
        'game' => $gameName,
        'type' => $saveType,
        'size' => strlen($data),
        'date' => $meta['date'],
        'timestamp' => $timestamp
    ]);
    exit;
}

// 3. ROUTE LOAD
if ($action === 'load' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $gameName = isset($_GET['game']) ? rawurldecode($_GET['game']) : '';
    if (empty($gameName)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nom de jeu manquant.']);
        exit;
    }

    $key = getGameKey($gameName);
    $reqType = $_GET['type'] ?? 'sram';
    $sramPath = $storageDir . '/' . $key . '.sram.bin';
    $statePath = $storageDir . '/' . $key . '.state.bin';
    $legacyPath = $storageDir . '/' . $key . '.bin';

    $savePath = '';
    if ($reqType === 'sram') {
        if (file_exists($sramPath)) $savePath = $sramPath;
        elseif (file_exists($legacyPath)) $savePath = $legacyPath;
    } else {
        if (file_exists($statePath)) $savePath = $statePath;
        elseif (file_exists($legacyPath)) $savePath = $legacyPath;
    }

    if (empty($savePath) || !file_exists($savePath)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Aucune sauvegarde trouvée sur le VPS.']);
        exit;
    }

    $meta = file_exists($metaPath = $storageDir . '/' . $key . '.meta.json') ? json_decode(file_get_contents($metaPath), true) : [];
    $data = file_get_contents($savePath);

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . strlen($data));
    header('X-Save-Game: ' . rawurlencode($meta['game'] ?? $gameName));
    header('X-Save-Type: ' . $reqType);
    header('X-Save-Date: ' . ($meta['date'] ?? date('d/m/Y H:i:s')));
    header('X-Save-Timestamp: ' . ($meta['timestamp'] ?? (filemtime($savePath) * 1000)));
    header('X-Save-Size: ' . strlen($data));

    echo $data;
    exit;
}

// 4. ROUTE LIST
if ($action === 'list' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $saves = [];
    $files = glob($storageDir . '/*.meta.json');
    if ($files) {
        foreach ($files as $mf) {
            $meta = json_decode(@file_get_contents($mf), true);
            if ($meta && !empty($meta['game'])) {
                $saves[$meta['game']] = $meta;
            }
        }
    }
    echo json_encode(['ok' => true, 'saves' => $saves]);
    exit;
}

// 5. ROUTE DELETE
if ($action === 'delete') {
    $gameName = isset($_GET['game']) ? rawurldecode($_GET['game']) : '';
    if (empty($gameName)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nom de jeu manquant.']);
        exit;
    }
    $key = getGameKey($gameName);
    @unlink($storageDir . '/' . $key . '.sram.bin');
    @unlink($storageDir . '/' . $key . '.state.bin');
    @unlink($storageDir . '/' . $key . '.bin');
    @unlink($storageDir . '/' . $key . '.meta.json');
    echo json_encode(['ok' => true]);
    exit;
}

// 6. ROUTE LIBRARY (Catalogue privé des reliques souveraines)
if ($action === 'library' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Accessible uniquement aux porteurs d'un token HMAC valide (Hibouxe)
    $catalogFile = $storageDir . '/vault_catalog.json';
    if (file_exists($catalogFile)) {
        $roms = json_decode(file_get_contents($catalogFile), true);
    } else {
        $roms = [
            [
                'nom' => 'Super Mario 64 DS (Europe) (En,Fr,De,Es,It).nds',
                'titre' => 'Super Mario 64 DS',
                'console' => 'nds',
                'desc' => "L'épopée 3D culte de la Nintendo DS avec Mario, Yoshi, Luigi et Wario (contrôles 360° actifs)."
            ],
            [
                'nom' => 'Dragon Quest - The Chapters of the Chosen (E).nds',
                'titre' => "Dragon Quest IV : L'Épopée des Élus (DS)",
                'console' => 'nds',
                'desc' => "Le remake culte sur Nintendo DS en 3D avec les cinq chapitres narratifs des élus (2008)."
            ],
            [
                'nom' => 'Dragon Quest V - The Hand of the Heavenly Bride (EU)(M5).nds',
                'titre' => 'Dragon Quest V : La Fiancée Céleste (DS)',
                'console' => 'nds',
                'desc' => "L'épopée magistrale sur trois générations adaptée en 3D sur Nintendo DS (2009)."
            ],
            [
                'nom' => 'Dragon Quest VI - Realms of Reverie (E).nds',
                'titre' => 'Dragon Quest VI : Le Royaume des Songes (DS)',
                'console' => 'nds',
                'desc' => "L'aventure entre le monde réel et le monde des songes sur Nintendo DS (2011)."
            ],
            [
                'nom' => 'Dragon Quest IX - Sentinels of the Starry Skies (Europe) (En,Fr,De,Es,It).nds',
                'titre' => 'Dragon Quest IX : Les Sentinelles du Firmament (DS)',
                'console' => 'nds',
                'desc' => "L'immense aventure RPG de Level-5 et Square Enix taillée pour la Nintendo DS (2010)."
            ],
            [
                'nom' => 'Tekken 3 (Europe).chd',
                'titre' => 'Tekken 3',
                'console' => 'ps1',
                'desc' => "Le titan absolu du jeu de combat 3D sur PlayStation 1 par Namco (1998)."
            ],
            [
                'nom' => 'MediEvil (France).chd',
                'titre' => 'MediEvil',
                'console' => 'ps1',
                'desc' => "L'épopée gothique et burlesque de Sir Daniel Fortesque à Gallowmere (1998)."
            ],
            [
                'nom' => 'Bomberman (Europe) (En,Fr,De,Es,It).iso',
                'titre' => 'Bomberman World',
                'console' => 'ps1',
                'desc' => "Le classique d'action explosive multijoueur sur PlayStation 1 (1998)."
            ],
            [
                'nom' => 'Super Mario World (Europe) (Rev 1).sfc',
                'titre' => 'Super Mario World',
                'console' => 'snes',
                'desc' => "Le chef-d'œuvre de plateforme de la Super Nintendo (1990)."
            ],
            [
                'nom' => 'CHRONO.SMC',
                'titre' => 'Chrono Trigger',
                'console' => 'snes',
                'desc' => "L'apogée du RPG narratif par la Dream Team de Square (1995)."
            ],
            [
                'nom' => 'Dragon Quest 5 (tr).sfc',
                'titre' => 'Dragon Quest V : La Fiancée Céleste (SNES)',
                'console' => 'snes',
                'desc' => "L'épopée sur trois générations d'Horie, Toriyama et Sugiyama (1992)."
            ],
            [
                'nom' => "Legend of Zelda, The - Link's Awakening DX (France) (Rev 1) (SGB Enhanced) (GB Compatible).gbc",
                'titre' => "The Legend of Zelda: Link's Awakening DX",
                'console' => 'gb',
                'desc' => "L'aventure onirique sur l'île Cocolint (Game Boy Color, 1998)."
            ],
            [
                'nom' => 'Pokemon - Version Jaune - Edition Speciale Pikachu (France) (CGB+SGB Enhanced).gb',
                'titre' => 'Pokémon Version Jaune : Édition Spéciale Pikachu',
                'console' => 'gb',
                'desc' => "L'aventure culte de Kanto avec Pikachu à vos côtés (1998)."
            ],
            [
                'nom' => 'Pokémon Emeraude FULL.gba',
                'titre' => 'Pokémon Version Émeraude',
                'console' => 'gba',
                'desc' => "Le summum de la Game Boy Advance dans la région de Hoenn (2004)."
            ],
            [
                'nom' => 'Super Mario Bros. 3 (USA) (Rev 1).nes',
                'titre' => 'Super Mario Bros. 3',
                'console' => 'nes',
                'desc' => "Le sommet technique et ludique de la NES 8-bit (1988)."
            ],
            [
                'nom' => 'Super Mario Bros. 2 (USA) (Rev 1).nes',
                'titre' => 'Super Mario Bros. 2',
                'console' => 'nes',
                'desc' => "L'aventure onirique de Subcon avec Mario, Luigi, Peach et Toad (1988)."
            ],
            [
                'nom' => 'Dragon Warrior 4 (U).nes',
                'titre' => 'Dragon Quest IV : Chapters of the Chosen (NES)',
                'console' => 'nes',
                'desc' => "L'épopée en cinq chapitres narratifs de Chunsoft et Yuji Horii sur NES (1990)."
            ],
            [
                'nom' => 'Dragon Warrior 3 (U) [T-Port1.1].nes',
                'titre' => 'Dragon Quest III : Soshite Densetsu e...',
                'console' => 'nes',
                'desc' => "Le mythe fondateur du J-RPG sur Famicom / NES (1988)."
            ],
            [
                'nom' => 'Dragon Warrior 2 (U).nes',
                'titre' => 'Dragon Quest II : Akuryo no Kamigami',
                'console' => 'nes',
                'desc' => "La suite légendaire et le périple des trois descendants de Roto (1987)."
            ],
            [
                'nom' => 'dq.nes',
                'titre' => 'Dragon Quest I (Dragon Warrior)',
                'console' => 'nes',
                'desc' => "La légende qui a tout commencé par Yuji Horii (1986)."
            ],
            [
                'nom' => 'Legend of Zelda, The (USA) (Rev 1).nes',
                'titre' => 'The Legend of Zelda',
                'console' => 'nes',
                'desc' => "Le commencement mythique de la quête d'Hyrule par Shigeru Miyamoto (1986)."
            ],
            [
                'nom' => 'Zelda II - The Adventure of Link (USA).nes',
                'titre' => 'Zelda II : The Adventure of Link',
                'console' => 'nes',
                'desc' => "L'aventure action-RPG culte et exigeante en vue de profil (1987)."
            ],
            [
                'nom' => 'console-nds-launcher',
                'titre' => 'Nintendo DS — Double Écran Tactile',
                'console' => 'nds',
                'desc' => "Moteur DeSmuME Desmond WebAssembly avec écran tactile stylet. Glissez ou insérez un fichier .nds."
            ]
        ];
    }
    echo json_encode([
        'ok' => true,
        'user' => $authData['user'] ?? 'Hibouxe',
        'count' => count($roms),
        'roms' => $roms
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Action inconnue.']);
