<?php
/**
 * Backend API Scoreboard Sécurisée - Portfolio Quentin Beaud (Hibouxe / Edsaje)
 * Système de classement en ligne avec :
 * - Validation stricte des données et assainissement XSS/Injection
 * - Plafonds de scores réalistes anti-absurdité
 * - Jeton de session signé (HMAC) et preuve de durée de jeu (Proof of Play)
 * - Rate-limiting par adresse IP
 * - Verrouillage atomique des écritures de fichiers (LOCK_EX)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/scores.json';
$rateLimitFile = __DIR__ . '/rate_limits.json';
$secretFile = __DIR__ . '/.secret';

// Clé secrète serveur pour signature HMAC des sessions
function getServerSecret($secretFile) {
    if (file_exists($secretFile)) {
        $secret = trim(@file_get_contents($secretFile));
        if (!empty($secret)) return $secret;
    }
    if (function_exists('random_bytes')) {
        try { $bytes = random_bytes(32); } catch (Exception $e) { $bytes = false; }
    } elseif (function_exists('openssl_random_pseudo_bytes')) {
        $bytes = openssl_random_pseudo_bytes(32);
    } else {
        $bytes = md5(uniqid(mt_rand(), true));
    }
    $newSecret = bin2hex($bytes ?: md5(uniqid(mt_rand(), true)));
    @file_put_contents($secretFile, $newSecret, LOCK_EX);
    return $newSecret;
}

$serverSecret = getServerSecret($secretFile);

// Liste des jeux autorisés
$allowedGames = ['snake', 'pong', 'breakout', 'flappy', 'invaders', 'run', 'tetris', 'vectrex', 'clicker'];

// Plafonds de scores maximums réalistes
$scoreCaps = [
    'snake' => 1200,
    'pong' => 15,
    'breakout' => 1500,
    'flappy' => 400,
    'invaders' => 15000,
    'run' => 10000,
    'tetris' => 50000,
    'vectrex' => 25000
    // clicker : aucun plafond (anti-cheat désactivé, score illimité)
];

// Ratio minimal de temps (secondes par point) pour vérifier la faisabilité physique
$minTimePerPoint = [
    'snake' => 0.20,     // au moins 0.20s par pomme
    'pong' => 1.5,       // au moins 1.5s par point
    'breakout' => 0.08,  // au moins 0.08s par point
    'flappy' => 0.70,    // au moins 0.70s par tuyau
    'invaders' => 0.03,  // au moins 0.03s par point
    'run' => 0.06,       // au moins 0.06s par point
    'tetris' => 0.015,   // au moins 0.015s par point
    'vectrex' => 0.03    // au moins 0.03s par point
];

// Initialisation des scores par défaut
function getDefaultScores() {
    return [
        'snake' => [
            ['tag' => 'HIB', 'score' => 280, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 210, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 150, 'date' => '2026-08-27'],
            ['tag' => 'NES', 'score' => 90, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 40, 'date' => '2026-08-29']
        ],
        'pong' => [
            ['tag' => 'HIB', 'score' => 15, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 11, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 8, 'date' => '2026-08-27'],
            ['tag' => 'VEX', 'score' => 5, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 3, 'date' => '2026-08-29']
        ],
        'breakout' => [
            ['tag' => 'HIB', 'score' => 540, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 420, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 310, 'date' => '2026-08-27'],
            ['tag' => 'BRK', 'score' => 180, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 90, 'date' => '2026-08-29']
        ],
        'flappy' => [
            ['tag' => 'HIB', 'score' => 42, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 31, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 22, 'date' => '2026-08-27'],
            ['tag' => 'OWL', 'score' => 14, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 5, 'date' => '2026-08-29']
        ],
        'invaders' => [
            ['tag' => 'HIB', 'score' => 1250, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 980, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 740, 'date' => '2026-08-27'],
            ['tag' => 'SPX', 'score' => 450, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 200, 'date' => '2026-08-29']
        ],
        'run' => [
            ['tag' => 'HIB', 'score' => 890, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 640, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 490, 'date' => '2026-08-27'],
            ['tag' => 'FOR', 'score' => 280, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 120, 'date' => '2026-08-29']
        ],
        'tetris' => [
            ['tag' => 'HIB', 'score' => 3200, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 2450, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 1800, 'date' => '2026-08-27'],
            ['tag' => 'TET', 'score' => 950, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 400, 'date' => '2026-08-29']
        ],
        'vectrex' => [
            ['tag' => 'HIB', 'score' => 1840, 'date' => '2026-08-25'],
            ['tag' => 'QUB', 'score' => 1420, 'date' => '2026-08-26'],
            ['tag' => 'EDS', 'score' => 960, 'date' => '2026-08-27'],
            ['tag' => 'VEX', 'score' => 520, 'date' => '2026-08-28'],
            ['tag' => 'AAA', 'score' => 220, 'date' => '2026-08-29']
        ],
        'clicker' => [
            ['tag' => 'HIBOUXE', 'score' => 5000000, 'date' => '2026-08-25'],
            ['tag' => 'EDSAJE', 'score' => 1200000, 'date' => '2026-08-26'],
            ['tag' => 'QUENTIN', 'score' => 450000, 'date' => '2026-08-27'],
            ['tag' => 'CHOUETTE', 'score' => 150000, 'date' => '2026-08-28'],
            ['tag' => 'APPRENTI', 'score' => 10000, 'date' => '2026-08-29']
        ]
    ];
}

// Chargement des scores
function loadScores($dataFile) {
    if (file_exists($dataFile)) {
        $content = @file_get_contents($dataFile);
        if ($content) {
            $data = json_decode($content, true);
            if (is_array($data)) return $data;
        }
    }
    return getDefaultScores();
}

// Sauvegarde atomique sécurisée
function saveScores($dataFile, $scores) {
    @file_put_contents($dataFile, json_encode($scores, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// Rate Limiting par adresse IP
function checkRateLimit($rateLimitFile) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $now = time();
    $limits = [];

    if (file_exists($rateLimitFile)) {
        $content = @file_get_contents($rateLimitFile);
        if ($content) {
            $limits = json_decode($content, true) ?: [];
        }
    }

    // Nettoyage des vieilles entrées (> 1 heure)
    foreach ($limits as $k => $v) {
        if ($now - $v['last_time'] > 3600) {
            unset($limits[$k]);
        }
    }

    if (isset($limits[$ip])) {
        // Bloquer si moins de 3 secondes depuis la dernière soumission
        if ($now - $limits[$ip]['last_time'] < 3) {
            return false;
        }
        // Bloquer si plus de 40 soumissions dans l'heure
        if ($limits[$ip]['count'] > 40) {
            return false;
        }
        $limits[$ip]['count']++;
        $limits[$ip]['last_time'] = $now;
    } else {
        $limits[$ip] = ['count' => 1, 'last_time' => $now];
    }

    @file_put_contents($rateLimitFile, json_encode($limits), LOCK_EX);
    return true;
}

// Création d'un token de session signé
function generateSessionToken($game, $serverSecret) {
    $payload = [
        'game' => $game,
        't' => time(),
        'nonce' => bin2hex(random_bytes(8))
    ];
    $json = json_encode($payload);
    $b64 = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $b64, $serverSecret);
    return $b64 . '.' . $sig;
}

// Vérification d'un token de session
function verifySessionToken($token, $game, $score, $scoreCaps, $minTimePerPoint, $serverSecret) {
    // Le clicker n'a pas de contrainte de durée immédiate
    if ($game === 'clicker') return true;

    if (empty($token) || strpos($token, '.') === false) {
        return false;
    }

    list($b64, $sig) = explode('.', $token, 2);
    $expectedSig = hash_hmac('sha256', $b64, $serverSecret);

    if (!hash_equals($expectedSig, $sig)) {
        return false;
    }

    $json = base64_decode(strtr($b64, '-_', '+/'));
    $payload = json_decode($json, true);

    if (!$payload || !isset($payload['game']) || !isset($payload['t'])) {
        return false;
    }

    if ($payload['game'] !== $game) {
        return false;
    }

    $startTime = intval($payload['t']);
    $now = time();
    $duration = $now - $startTime;

    // Token expiré après 3 heures
    if ($duration > 10800) {
        return false;
    }

    // Preuve de temps minimale
    $ratio = isset($minTimePerPoint[$game]) ? $minTimePerPoint[$game] : 0.05;
    $minRequiredSeconds = ($score * $ratio) - 1; // 1s de marge réseau/lag

    if ($score > 10 && $duration < $minRequiredSeconds) {
        return false;
    }

    return true;
}

$scores = loadScores($dataFile);

// ROUTE GET : Démarrage de session OU Récupération des scores
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? trim($_GET['action']) : '';
    $game = isset($_GET['game']) ? strtolower(trim($_GET['game'])) : 'all';

    // 1. Démarrer une session de jeu sécurisée
    if ($action === 'start_session') {
        if (in_array($game, $allowedGames)) {
            $token = generateSessionToken($game, $serverSecret);
            echo json_encode(['status' => 'success', 'game' => $game, 'session' => $token]);
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Jeu non valide']);
        }
        exit;
    }

    // 2. Récupérer les scores du tableau
    if ($game === 'all') {
        echo json_encode(['status' => 'success', 'data' => $scores]);
    } elseif (in_array($game, $allowedGames)) {
        $gameScores = isset($scores[$game]) ? $scores[$game] : [];
        echo json_encode(['status' => 'success', 'game' => $game, 'data' => $gameScores]);
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Jeu non reconnu']);
    }
    exit;
}

// ROUTE POST : Enregistrement d'un score avec contrôles de sécurité
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $body = json_decode($input, true);

    if (!$body) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Données JSON invalides']);
        exit;
    }

    $game = isset($body['game']) ? strtolower(trim($body['game'])) : '';
    $rawTag = isset($body['tag']) ? trim($body['tag']) : '';
    $scoreVal = isset($body['score']) ? floatval($body['score']) : 0;
    $sessionToken = isset($body['session']) ? trim($body['session']) : '';

    if (!in_array($game, $allowedGames)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Jeu non autorisé']);
        exit;
    }

    // 1. Contrôle du Rate Limit IP (les scores clicker ne sont pas bloqués par l'anti-flood)
    if ($game !== 'clicker' && !checkRateLimit($rateLimitFile)) {
        http_response_code(429);
        echo json_encode(['status' => 'error', 'message' => 'Trop de requêtes. Veuillez patienter quelques secondes.']);
        exit;
    }

    // 2. Validation du score (Anti-cheat désactivé pour le clicker : score libre et illimité)
    if ($game !== 'clicker') {
        $maxAllowed = isset($scoreCaps[$game]) ? $scoreCaps[$game] : 50000;
        if ($scoreVal < 0 || !is_numeric($scoreVal) || $scoreVal > $maxAllowed) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Score hors limites autorisées']);
            exit;
        }
    } else {
        // Mode libre pour le clicker : aucun plafond de score, autoclickers et scripts autorisés
        if ($scoreVal < 0 || !is_numeric($scoreVal)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Score invalide']);
            exit;
        }
    }

    // 3. Validation de la preuve de durée (session token) - Désactivée pour le clicker
    if (!empty($sessionToken) && $game !== 'clicker') {
        $isValidSession = verifySessionToken($sessionToken, $game, $scoreVal, $scoreCaps, $minTimePerPoint, $serverSecret);
        if (!$isValidSession) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Session de jeu invalide ou durée incohérente']);
            exit;
        }
    }

    // 4. Nettoyage et assainissement strict du tag
    if ($game === 'clicker') {
        $tag = strtoupper(preg_replace('/[^A-Za-z0-9_\-]/', '', $rawTag));
        if (strlen($tag) < 2) $tag = 'JOUEUR';
        if (strlen($tag) > 10) $tag = substr($tag, 0, 10);
    } else {
        $tag = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $rawTag));
        if (strlen($tag) !== 3) {
            $tag = substr($tag . 'AAA', 0, 3);
        }
    }

    if (!isset($scores[$game])) {
        $scores[$game] = [];
    }

    $newEntry = [
        'tag' => $tag,
        'score' => $scoreVal,
        'date' => date('Y-m-d')
    ];

    $scores[$game][] = $newEntry;

    // Tri décroissant par score
    usort($scores[$game], function ($a, $b) {
        if ($b['score'] == $a['score']) return 0;
        return ($b['score'] > $a['score']) ? 1 : -1;
    });

    // Rang obtenu
    $rank = 0;
    foreach ($scores[$game] as $idx => $entry) {
        if ($entry['tag'] === $tag && $entry['score'] == $scoreVal) {
            $rank = $idx + 1;
            break;
        }
    }

    // Conserver uniquement le Top 10
    $scores[$game] = array_slice($scores[$game], 0, 10);

    // Sauvegarde atomique
    saveScores($dataFile, $scores);

    echo json_encode([
        'status' => 'success',
        'message' => 'Score validé et enregistré !',
        'game' => $game,
        'rank' => $rank,
        'isTop10' => ($rank <= 10 && $rank > 0),
        'data' => $scores[$game]
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée']);
