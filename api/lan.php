<?php
/**
 * API Sanctuaire LAN & Netplay P2P (Portfolio Quentin Beaud)
 * Signalisation ultra-légère WebRTC pour le jeu coopératif en ligne (RetroVault & Dolphin)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Répertoire de stockage des salons
$storageDir = '/var/www/storage/lan_rooms';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0755, true);
}
if (!is_dir($storageDir) || !is_writable($storageDir)) {
    $storageDir = sys_get_temp_dir() . '/lan_rooms';
    if (!is_dir($storageDir)) @mkdir($storageDir, 0755, true);
}

// Extraction du token d'authentification
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
}

// Lecture du corps JSON si présent
$rawBody = file_get_contents('php://input');
$jsonBody = !empty($rawBody) ? json_decode($rawBody, true) : [];
if (!is_array($jsonBody)) $jsonBody = [];

// Détermination de l'action
$action = $_GET['action'] ?? $_GET['dolphin_action'] ?? $jsonBody['action'] ?? '';
$isDolphin = isset($_GET['dolphin_action']) || strpos($_SERVER['REQUEST_URI'] ?? '', '/lan-api/') !== false;

// Nettoyage périodique aléatoire (1 requête sur 20)
if (mt_rand(1, 20) === 1) {
    cleanupOldRooms($storageDir);
}

// --- Fonctions utilitaires ---

function cleanupOldRooms($dir) {
    if (!is_dir($dir)) return;
    $now = time();
    $files = @scandir($dir);
    if (!$files) return;
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        $path = $dir . '/' . $f;
        if (is_file($path)) {
            $mtime = @filemtime($path);
            if ($now - $mtime > 3600) { // Plus d'1h sans modification
                @unlink($path);
            }
        }
    }
}

function getRoomFilePath($storageDir, $roomId) {
    $cleanId = strtoupper(preg_replace('/[^a-zA-Z0-9_-]/', '', $roomId));
    if (empty($cleanId)) return null;
    return $storageDir . '/room_' . $cleanId . '.json';
}

function loadRoom($storageDir, $roomId) {
    $path = getRoomFilePath($storageDir, $roomId);
    if (!$path || !is_file($path)) return null;
    $content = @file_get_contents($path);
    if (!$content) return null;
    $data = @json_decode($content, true);
    return is_array($data) ? $data : null;
}

function saveRoom($storageDir, $roomId, $data) {
    $path = getRoomFilePath($storageDir, $roomId);
    if (!$path) return false;
    $data['last_active'] = time();
    $temp = $path . '.tmp.' . uniqid();
    if (@file_put_contents($temp, json_encode($data, JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) {
        @rename($temp, $path);
        return true;
    }
    return false;
}

function generateShortCode($length = 6) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans O, 0, 1, I pour éviter les confusions
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

function generateToken() {
    return bin2hex(random_bytes(16));
}

// Trouver une session par token
function findSessionByToken($storageDir, $token) {
    if (empty($token) || !is_dir($storageDir)) return null;
    $files = @scandir($storageDir);
    if (!$files) return null;
    foreach ($files as $f) {
        if (strpos($f, 'room_') === 0 && substr($f, -5) === '.json') {
            $path = $storageDir . '/' . $f;
            $data = @json_decode(@file_get_contents($path), true);
            if (is_array($data) && !empty($data['peers'])) {
                foreach ($data['peers'] as $peerRole => $peerInfo) {
                    if (($peerInfo['token'] ?? '') === $token) {
                        return [
                            'room' => $data,
                            'role' => $peerRole,
                            'roomId' => $data['id']
                        ];
                    }
                }
            }
        }
    }
    return null;
}

function listPublicLobbies($storageDir) {
    $lobbies = [];
    if (!is_dir($storageDir)) return $lobbies;
    $files = @scandir($storageDir);
    if (!$files) return $lobbies;
    $now = time();
    foreach ($files as $f) {
        if (strpos($f, 'room_') === 0 && substr($f, -5) === '.json') {
            $path = $storageDir . '/' . $f;
            $data = @json_decode(@file_get_contents($path), true);
            if (is_array($data) && !empty($data['public'])) {
                if ($now - ($data['last_active'] ?? 0) < 600) {
                    $peerCount = count($data['peers'] ?? []);
                    $lobbies[] = [
                        'id' => $data['id'],
                        'name' => $data['name'] ?? ('Salon ' . $data['id']),
                        'full' => $peerCount >= ($data['max_players'] ?? 2)
                    ];
                }
            }
        }
    }
    return $lobbies;
}

// --- Routes de l'API ---

// 1. Initialisation de connexion (compatible Dolphin lan-server.js)
if ($action === 'connect') {
    $clientToken = generateToken();
    echo json_encode(['token' => $clientToken, 'ok' => true]);
    exit;
}

// 2. Création de salon
if ($action === 'create') {
    $roomId = strtoupper(trim($jsonBody['room'] ?? $_GET['room'] ?? ''));
    if (empty($roomId)) {
        $roomId = 'SANCT-' . generateShortCode(4);
    }
    $roomName = trim($jsonBody['name'] ?? $_GET['name'] ?? ('Sanctuaire LAN ' . $roomId));
    $isPublic = !empty($jsonBody['public']) || !empty($_GET['public']);
    $maxPlayers = intval($jsonBody['max_players'] ?? 2);
    if ($maxPlayers < 2 || $maxPlayers > 4) $maxPlayers = 2;

    $hostToken = !empty($token) ? $token : generateToken();
    $roomData = [
        'id' => $roomId,
        'name' => $roomName,
        'public' => $isPublic,
        'max_players' => $maxPlayers,
        'created_at' => time(),
        'last_active' => time(),
        'peers' => [
            'host' => [
                'token' => $hostToken,
                'joined_at' => time()
            ]
        ],
        'events' => [
            'host' => [],
            'guests' => []
        ]
    ];

    saveRoom($storageDir, $roomId, $roomData);

    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'quentinbeaud.com');
    $inviteUrl = $baseUrl . '/?lan=' . $roomId;

    if ($isDolphin) {
        echo json_encode([
            'room' => $roomId,
            'invite' => $roomId,
            'token' => $hostToken
        ]);
    } else {
        echo json_encode([
            'ok' => true,
            'room' => $roomId,
            'invite' => $inviteUrl,
            'token' => $hostToken,
            'role' => 'host'
        ]);
    }
    exit;
}

// 3. Rejoindre un salon
if ($action === 'join') {
    $code = strtoupper(trim($jsonBody['code'] ?? $jsonBody['room'] ?? $_GET['code'] ?? $_GET['room'] ?? ''));
    $room = loadRoom($storageDir, $code);

    if (!$room) {
        http_response_code(404);
        echo json_encode(['error' => 'Salon introuvable ou expiré.', 'ok' => false]);
        exit;
    }

    $peers = $room['peers'] ?? [];
    $guestRole = 'guest';
    if (isset($peers['guest'])) {
        if (isset($peers['guest_2'])) {
            http_response_code(409);
            echo json_encode(['error' => 'Ce salon est déjà complet (maximum atteint).', 'ok' => false]);
            exit;
        }
        $guestRole = 'guest_2';
    }

    $guestToken = !empty($token) ? $token : generateToken();
    $room['peers'][$guestRole] = [
        'token' => $guestToken,
        'joined_at' => time()
    ];
    if (!isset($room['events'][$guestRole])) {
        $room['events'][$guestRole] = [];
    }

    // Avertir l'hôte qu'un pair a rejoint
    $room['events']['host'][] = [
        'type' => 'peer-joined',
        'role' => $guestRole,
        'timestamp' => time()
    ];

    saveRoom($storageDir, $code, $room);

    if ($isDolphin) {
        echo json_encode([
            'room' => $code,
            'token' => $guestToken
        ]);
    } else {
        echo json_encode([
            'ok' => true,
            'room' => $code,
            'token' => $guestToken,
            'role' => $guestRole,
            'player' => ($guestRole === 'guest' ? 2 : 3)
        ]);
    }
    exit;
}

// Pour les actions suivantes, identifier la session par token ou room + token
$session = findSessionByToken($storageDir, $token);
$roomId = $session['roomId'] ?? trim($jsonBody['room'] ?? $_GET['room'] ?? '');
$role = $session['role'] ?? trim($jsonBody['role'] ?? $_GET['role'] ?? '');

$room = $roomId ? loadRoom($storageDir, $roomId) : null;

// 4. Signalisation WebRTC (échange SDP Offer/Answer et ICE candidates)
if ($action === 'signal') {
    if (!$room) {
        http_response_code(404);
        echo json_encode(['error' => 'Salon introuvable.', 'ok' => false]);
        exit;
    }

    $description = $jsonBody['description'] ?? $jsonBody['signal'] ?? $jsonBody;
    $targetRole = ($role === 'host') ? 'guest' : 'host';

    // Déposer l'événement pour l'autre participant
    if (!isset($room['events'][$targetRole])) {
        $room['events'][$targetRole] = [];
    }

    $room['events'][$targetRole][] = [
        'type' => 'signal',
        'from' => $role,
        'description' => $description,
        'timestamp' => time()
    ];

    saveRoom($storageDir, $roomId, $room);

    echo json_encode(['ok' => true]);
    exit;
}

// 5. Polling des signaux et de l'état du salon
if ($action === 'poll') {
    $lobbies = listPublicLobbies($storageDir);

    if (!$room || !$role) {
        echo json_encode([
            'room' => null,
            'lobbies' => $lobbies,
            'events' => [],
            'ok' => true
        ]);
        exit;
    }

    // Récupérer et purger les événements destinés à ce participant
    $myEvents = $room['events'][$role] ?? [];
    $room['events'][$role] = [];
    saveRoom($storageDir, $roomId, $room);

    echo json_encode([
        'room' => $roomId,
        'role' => $role,
        'lobbies' => $lobbies,
        'events' => $myEvents,
        'peers_count' => count($room['peers'] ?? []),
        'ok' => true
    ]);
    exit;
}

// 6. Quitter ou fermer un salon
if ($action === 'leave' || $action === 'disconnect') {
    if ($room && $role) {
        unset($room['peers'][$role]);
        $targetRole = ($role === 'host') ? 'guest' : 'host';
        if (isset($room['events'][$targetRole])) {
            $room['events'][$targetRole][] = [
                'type' => ($role === 'host' ? 'closed' : 'peer-left'),
                'timestamp' => time()
            ];
        }
        if (empty($room['peers']) || $role === 'host') {
            $path = getRoomFilePath($storageDir, $roomId);
            if ($path && is_file($path)) @unlink($path);
        } else {
            saveRoom($storageDir, $roomId, $room);
        }
    }
    echo json_encode(['ok' => true]);
    exit;
}

// Action non reconnue
http_response_code(400);
echo json_encode(['error' => 'Action inconnue.', 'action' => $action, 'ok' => false]);
exit;
