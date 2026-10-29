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
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = '';
if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
    $token = $matches[1];
} elseif (!empty($_GET['token'])) {
    $token = $_GET['token'];
}

$authData = verifyAuthToken($token, $serverSecret);
if (!$authData) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Session expirée ou non autorisée.']);
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

    $savePath = $storageDir . '/' . $key . '.bin';
    $metaPath = $storageDir . '/' . $key . '.meta.json';

    file_put_contents($savePath, $data, LOCK_EX);

    $meta = [
        'game' => $gameName,
        'type' => $saveType,
        'timestamp' => $timestamp,
        'date' => date('d/m/Y H:i:s'),
        'size' => strlen($data),
        'hash' => sha1($data)
    ];
    file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT), LOCK_EX);

    echo json_encode([
        'ok' => true,
        'game' => $gameName,
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
    $savePath = $storageDir . '/' . $key . '.bin';
    $metaPath = $storageDir . '/' . $key . '.meta.json';

    if (!file_exists($savePath)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Aucune sauvegarde trouvée sur le VPS.']);
        exit;
    }

    $meta = file_exists($metaPath) ? json_decode(file_get_contents($metaPath), true) : [];
    $data = file_get_contents($savePath);

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . strlen($data));
    header('X-Save-Game: ' . rawurlencode($meta['game'] ?? $gameName));
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
    @unlink($storageDir . '/' . $key . '.bin');
    @unlink($storageDir . '/' . $key . '.meta.json');
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Action inconnue.']);
