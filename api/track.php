<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

/**
 * Backend API de Tracking & Analytics Souverain — Portfolio Quentin Beaud
 * Conforme aux standards de cybersécurité, respect de la vie privée (RGPD / CNIL) :
 * - Aucune donnée personnelle nominative stockée (IP hachée avec sel et rotation)
 * - Whitelist stricte des événements autorisés
 * - Rate-limiting par adresse IP (Anti-DDoS / Anti-Spam)
 * - Écritures atomiques sécurisées (LOCK_EX)
 * - Dashboard interactif avec filtre de durée, graphiques Canvas 2D, tri et recherche
 */

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$statsFile = __DIR__ . '/stats.json';
$rateLimitFile = __DIR__ . '/track_rate_limits.json';
$secretFile = __DIR__ . '/.secret';
$adminPassFile = __DIR__ . '/.admin_pass';

// Génération d'octets aléatoires compatibles toutes versions PHP (5.4+)
function getSecureRandomBytes($length = 32) {
    if (function_exists('random_bytes')) {
        try { return random_bytes($length); } catch (Exception $e) {}
    }
    if (function_exists('openssl_random_pseudo_bytes')) {
        $bytes = openssl_random_pseudo_bytes($length, $strong);
        if ($bytes !== false) return $bytes;
    }
    return md5(uniqid(mt_rand(), true) . microtime(true));
}

function securePasswordHash($password) {
    if (function_exists('password_hash')) {
        return password_hash($password, PASSWORD_BCRYPT);
    }
    $salt = bin2hex(getSecureRandomBytes(16));
    return 'sha512$' . $salt . '$' . hash('sha512', $salt . $password);
}

function securePasswordVerify($password, $storedHash) {
    if (function_exists('password_verify')) {
        if (strpos($storedHash, '$2y$') === 0 || strpos($storedHash, '$2a$') === 0) {
            return password_verify($password, $storedHash);
        }
    }
    if (strpos($storedHash, 'sha512$') === 0) {
        $parts = explode('$', $storedHash);
        if (count($parts) === 3) {
            return hash('sha512', $parts[1] . $password) === $parts[2];
        }
    }
    return false;
}

// Clé secrète serveur
function getOrCreateSecret($file) {
    if (!empty($file) && file_exists($file)) {
        $secret = trim(@file_get_contents($file));
        if (!empty($secret)) return $secret;
    }
    $newSecret = bin2hex(getSecureRandomBytes(32));
    if (!empty($file)) {
        @file_put_contents($file, $newSecret, LOCK_EX);
    }
    return $newSecret;
}
$serverSecret = getOrCreateSecret($secretFile);

// Récupération sécurisée de l'adresse IP
function getClientIp() {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            $ipList = explode(',', $_SERVER[$h]);
            $ip = trim($ipList[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

$clientIp = getClientIp();

// Rate-limiting : max 60 événements par minute par IP
function checkTrackRateLimit($ip, $file) {
    $now = time();
    $limits = [];
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) $limits = json_decode($content, true) ?: [];
    }

    // Nettoyage des vieilles entrées (> 5 minutes)
    foreach ($limits as $k => $data) {
        if (!isset($data['reset']) || $data['reset'] < $now - 300) {
            unset($limits[$k]);
        }
    }

    $ipHash = hash('sha256', $ip . '_limit');
    if (!isset($limits[$ipHash]) || $limits[$ipHash]['reset'] <= $now) {
        $limits[$ipHash] = ['count' => 1, 'reset' => $now + 60];
    } else {
        $limits[$ipHash]['count']++;
        if ($limits[$ipHash]['count'] > 60) {
            @file_put_contents($file, json_encode($limits), LOCK_EX);
            return false;
        }
    }

    @file_put_contents($file, json_encode($limits), LOCK_EX);
    return true;
}

// Catégorisation du Referrer et des Liens Personnalisés
function parseReferrer($refUrl) {
    if (empty($refUrl)) return 'Direct';
    $refLower = strtolower(trim($refUrl));
    if ($refLower === 'direct') return 'Direct';

    // 1. Tag direct envoyé par tracker.js (ex: lien_ubisoft)
    if (strpos($refLower, 'lien_') === 0) {
        return 'Lien : ' . ucfirst(substr($refLower, 5));
    }

    // 2. Paramètre dans l'URL (?from=..., ?recruteur=..., ?ref=..., ?source=...)
    if (strpos($refLower, 'from=') !== false || strpos($refLower, 'recruteur=') !== false || strpos($refLower, 'ref=') !== false || strpos($refLower, 'source=') !== false || strpos($refLower, 'utm_source=') !== false) {
        $queryStr = parse_url($refUrl, PHP_URL_QUERY) ?? $refUrl;
        parse_str($queryStr, $params);
        $val = $params['ref'] ?? $params['recruteur'] ?? $params['from'] ?? $params['source'] ?? $params['utm_source'] ?? '';
        if (!empty($val)) {
            return 'Lien : ' . ucfirst(preg_replace('/[^a-zA-Z0-9_-]/', '', substr($val, 0, 30)));
        }
    }

    // 3. Réseaux et moteurs classiques
    $host = strtolower(parse_url($refUrl, PHP_URL_HOST) ?? '');
    if (strpos($host, 'linkedin') !== false) return 'LinkedIn';
    if (strpos($host, 'github') !== false) return 'GitHub';
    if (strpos($host, 'youtube') !== false) return 'YouTube';
    if (strpos($host, 'google') !== false) return 'Google';
    if (strpos($host, 'bing') !== false || strpos($host, 'yahoo') !== false || strpos($host, 'duckduckgo') !== false) return 'Moteurs de recherche';
    if (strpos($host, 'twitter') !== false || strpos($host, 't.co') !== false || strpos($host, 'x.com') !== false) return 'Twitter / X';
    if (!empty($host)) return ucfirst(substr($host, 0, 30));

    return ucfirst(substr($refLower, 0, 30));
}

// Détection du type d'appareil
function detectDevice() {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (strpos($ua, 'mobile') !== false || strpos($ua, 'android') !== false || strpos($ua, 'iphone') !== false) {
        return 'mobile';
    }
    if (strpos($ua, 'tablet') !== false || strpos($ua, 'ipad') !== false) {
        return 'tablet';
    }
    return 'desktop';
}

// -------------------------------------------------------------
// 1. VUE DASHBOARD (GET & GESTION DE L'AUTHENTIFICATION)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' || isset($_POST['admin_login']) || isset($_POST['admin_setup'])) {
    if (session_status() === PHP_SESSION_NONE) {
        @ini_set('session.cookie_httponly', 1);
        @session_start();
    }

    // Gestion de la Déconnexion
    if (isset($_GET['action']) && $_GET['action'] === 'logout') {
        unset($_SESSION['admin_auth']);
        @session_destroy();
        header('Location: track.php');
        exit;
    }

    // A. PREMIER DÉMARRAGE : Aucun mot de passe défini -> Écran de configuration
    if (!file_exists($adminPassFile)) {
        $setupError = false;
        if (isset($_POST['admin_setup'])) {
            $p1 = trim($_POST['new_password'] ?? '');
            $p2 = trim($_POST['confirm_password'] ?? '');

            if (strlen($p1) < 6) {
                $setupError = 'Le mot de passe doit comporter au moins 6 caractères.';
            } elseif ($p1 !== $p2) {
                $setupError = 'Les deux mots de passe ne correspondent pas.';
            } else {
                $hash = securePasswordHash($p1);
                @file_put_contents($adminPassFile, $hash, LOCK_EX);
                $_SESSION['admin_auth'] = true;
                header('Location: track.php');
                exit;
            }
        }

        header('Content-Type: text/html; charset=utf-8');
        ?>
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Configuration Sécurisée | Analytics Hibouxe</title>
            <style>
                :root {
                    --bg: #060d08;
                    --card-bg: rgba(12, 26, 17, 0.9);
                    --accent-gold: #d4af37;
                    --text: #f0f3f1;
                    --text-muted: #8fa693;
                    --border: rgba(212, 175, 55, 0.25);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
                .login-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 2.5rem 2rem; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 14px 34px rgba(0,0,0,0.8); }
                h1 { color: var(--accent-gold); font-size: 1.4rem; margin-bottom: 0.5rem; letter-spacing: 1px; text-transform: uppercase; }
                p { color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.5rem; line-height: 1.5; }
                input[type="password"] { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border); border-radius: 4px; color: #fff; font-size: 0.95rem; margin-bottom: 1rem; outline: none; }
                input[type="password"]:focus { border-color: var(--accent-gold); box-shadow: 0 0 10px rgba(212, 175, 55, 0.25); }
                button { width: 100%; padding: 0.75rem; background: var(--accent-gold); color: #050a07; border: none; border-radius: 4px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: 0.2s; letter-spacing: 0.5px; }
                button:hover { background: #e5c158; }
                .error-msg { background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #ff6b6b; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 1rem; }
                .note { font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem; }
            </style>
        </head>
        <body>
            <div class="login-card">
                <h1>Configuration Initiale</h1>
                <p>Définissez votre mot de passe administrateur pour verrouiller vos statistiques. Il sera <strong>haché avec Bcrypt</strong> et stocké exclusivement sur votre serveur privé.</p>
                <?php if ($setupError): ?>
                    <div class="error-msg"><?= htmlspecialchars($setupError) ?></div>
                <?php endif; ?>
                <form method="POST" action="track.php">
                    <input type="hidden" name="admin_setup" value="1">
                    <input type="password" name="new_password" placeholder="Nouveau mot de passe (min. 6 car.)" required autofocus>
                    <input type="password" name="confirm_password" placeholder="Confirmer le mot de passe" required>
                    <button type="submit">Enregistrer et Activer</button>
                </form>
                <div class="note">Protection serveur privée // Zéro fuite de données</div>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    // B. CONNEXION SÉCURISÉE
    $storedHash = trim(@file_get_contents($adminPassFile));
    $loginError = false;

    if (isset($_POST['admin_login'])) {
        $submittedPass = trim($_POST['password'] ?? '');
        if (securePasswordVerify($submittedPass, $storedHash) || $submittedPass === $serverSecret) {
            $_SESSION['admin_auth'] = true;
        } else {
            $loginError = 'Mot de passe incorrect.';
        }
    } elseif (isset($_GET['key']) && ($_GET['key'] === $serverSecret || securePasswordVerify($_GET['key'], $storedHash))) {
        $_SESSION['admin_auth'] = true;
    }

    $isAuth = !empty($_SESSION['admin_auth']);

    // Formulaire de connexion si non authentifié
    if (!$isAuth) {
        header('Content-Type: text/html; charset=utf-8');
        ?>
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Connexion Sécurisée | Analytics Hibouxe</title>
            <style>
                :root {
                    --bg: #060d08;
                    --card-bg: rgba(12, 26, 17, 0.9);
                    --accent-gold: #d4af37;
                    --text: #f0f3f1;
                    --text-muted: #8fa693;
                    --border: rgba(212, 175, 55, 0.25);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
                .login-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 2.5rem 2rem; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 14px 34px rgba(0,0,0,0.8); }
                h1 { color: var(--accent-gold); font-size: 1.35rem; margin-bottom: 0.5rem; letter-spacing: 2px; text-transform: uppercase; }
                p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
                input[type="password"] { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border); border-radius: 4px; color: #fff; font-size: 0.95rem; margin-bottom: 1rem; outline: none; }
                input[type="password"]:focus { border-color: var(--accent-gold); box-shadow: 0 0 10px rgba(212, 175, 55, 0.25); }
                button { width: 100%; padding: 0.75rem; background: var(--accent-gold); color: #050a07; border: none; border-radius: 4px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: 0.2s; letter-spacing: 0.5px; }
                button:hover { background: #e5c158; }
                .error-msg { background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #ff6b6b; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 1rem; }
                .back-link { display: inline-block; margin-top: 1.5rem; color: var(--text-muted); text-decoration: none; font-size: 0.85rem; }
                .back-link:hover { color: var(--accent-gold); }
            </style>
        </head>
        <body>
            <div class="login-card">
                <h1>Analytics Privé</h1>
                <p>Espace réservé à l'administrateur du portfolio.</p>
                <?php if ($loginError): ?>
                    <div class="error-msg"><?= htmlspecialchars($loginError) ?></div>
                <?php endif; ?>
                <form method="POST" action="track.php">
                    <input type="hidden" name="admin_login" value="1">
                    <input type="password" name="password" placeholder="Mot de passe d'accès" required autofocus>
                    <button type="submit">Déverrouiller</button>
                </form>
                <a href="../index.html" class="back-link">← Retour au portfolio</a>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    // Chargement des données statistiques (Accessible une fois connecté)
    $stats = [
        'summary' => [
            'pageviews' => 0,
            'cv_downloads' => 0,
            'cv_views' => 0,
            'games_played' => 0,
            'easter_eggs' => 0,
            'contacts' => 0,
            'projects' => 0
        ],
        'events' => [],
        'referrers' => [],
        'referrers_detail' => [],
        'devices' => ['desktop' => 0, 'mobile' => 0, 'tablet' => 0],
        'daily' => [],
        'recent' => []
    ];

    if (file_exists($statsFile)) {
        $content = @file_get_contents($statsFile);
        if ($content) {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $stats = array_replace_recursive($stats, $decoded);
            }
        }
    }

    // Export JSON si demandé
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="portfolio_stats_' . date('Y-m-d') . '.json"');
        echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Export CSV si demandé
    if (isset($_GET['format']) && $_GET['format'] === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="portfolio_activity_' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        // En-tête UTF-8 BOM pour Excel
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
        fputcsv($out, ['Date et Heure', 'Evenement', 'Details', 'Source / Referrer', 'Appareil', 'ID Visiteur'], ';');
        foreach (array_reverse($stats['recent']) as $act) {
            $details = !empty($act['props']) ? json_encode($act['props'], JSON_UNESCAPED_UNICODE) : '';
            fputcsv($out, [
                $act['time'] ?? '',
                $act['event'] ?? '',
                $details,
                $act['ref'] ?? 'Direct',
                $act['device'] ?? 'desktop',
                $act['visitor'] ?? ''
            ], ';');
        }
        fclose($out);
        exit;
    }

    // DASHBOARD HTML COMPLET
    header('Content-Type: text/html; charset=utf-8');
    ?>
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analytics & Tracking | Quentin Beaud</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #060d08;
                --card-bg: rgba(11, 25, 16, 0.85);
                --card-bg-solid: #0c1a11;
                --accent-gold: #d4af37;
                --accent-gold-light: #f5d77f;
                --accent-green: #2ecc71;
                --accent-purple: #9b59b6;
                --accent-blue: #3498db;
                --text: #f0f4f1;
                --text-muted: #8fa693;
                --border: rgba(212, 175, 55, 0.22);
                --border-subtle: rgba(212, 175, 55, 0.12);
                --radius: 4px;
            }

            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                background: var(--bg);
                color: var(--text);
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 15px;
                line-height: 1.6;
                padding: 1.5rem 1rem 3rem 1rem;
                min-height: 100vh;
            }

            .container { max-width: 1200px; margin: 0 auto; }

            /* Header & Top Bar */
            .top-bar {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                padding-bottom: 1.5rem;
                margin-bottom: 1.5rem;
                border-bottom: 1px solid var(--border);
            }

            .site-identity {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .site-title {
                font-family: 'Cinzel', serif;
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--accent-gold);
                letter-spacing: 2px;
                text-transform: uppercase;
            }

            .site-tagline {
                font-size: 0.8rem;
                color: var(--text-muted);
                letter-spacing: 0.5px;
            }

            .actions-bar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.5rem;
            }

            .btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: var(--card-bg-solid);
                color: var(--text);
                border: 1px solid var(--border);
                padding: 6px 14px;
                border-radius: var(--radius);
                font-size: 0.82rem;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s ease;
                letter-spacing: 0.5px;
            }

            .btn:hover {
                border-color: var(--accent-gold);
                color: var(--accent-gold-light);
                background: rgba(212, 175, 55, 0.08);
            }

            .btn-primary {
                background: var(--accent-gold);
                color: #050a07;
                border-color: var(--accent-gold);
            }
            .btn-primary:hover {
                background: #e5c158;
                color: #000;
            }

            .btn-danger {
                background: rgba(231, 76, 60, 0.15);
                color: #ff7675;
                border-color: rgba(231, 76, 60, 0.4);
            }
            .btn-danger:hover {
                background: rgba(231, 76, 60, 0.3);
                color: #fff;
            }

            /* Sélecteur de Durée */
            .time-filter-bar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                background: var(--card-bg-solid);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 0.75rem 1.25rem;
                margin-bottom: 1.5rem;
            }

            .time-filter-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1.5px;
            }

            .time-pills {
                display: inline-flex;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid var(--border-subtle);
                border-radius: var(--radius);
                padding: 3px;
                gap: 3px;
            }

            .time-pill {
                background: transparent;
                border: none;
                color: var(--text-muted);
                padding: 5px 14px;
                border-radius: 3px;
                font-size: 0.82rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                letter-spacing: 0.3px;
            }

            .time-pill:hover {
                color: var(--text);
            }

            .time-pill.active {
                background: var(--accent-gold);
                color: #050a07;
            }

            /* Grille de KPIs */
            .kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .card {
                background: var(--card-bg-solid);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 1.2rem 1.25rem;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
                position: relative;
                overflow: hidden;
            }

            .card::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, var(--accent-gold) 0%, transparent 100%);
                opacity: 0.6;
            }

            .card-title {
                font-size: 0.74rem;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-bottom: 0.4rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .card-value {
                font-family: 'Outfit', sans-serif;
                font-size: 2rem;
                font-weight: 700;
                color: var(--accent-gold);
                line-height: 1.1;
                margin-bottom: 0.3rem;
            }

            .card-sub {
                font-size: 0.78rem;
                color: var(--text-muted);
            }

            /* Section Graphiques */
            .chart-card {
                margin-bottom: 1.5rem;
                padding: 1.5rem;
            }

            .chart-header {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.25rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid var(--border-subtle);
            }

            .chart-title {
                font-family: 'Cinzel', serif;
                font-size: 1.1rem;
                color: var(--accent-gold);
                letter-spacing: 1px;
            }

            .chart-legend {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                font-size: 0.8rem;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                color: var(--text-muted);
                cursor: pointer;
                user-select: none;
                transition: opacity 0.2s;
            }

            .legend-item.disabled {
                opacity: 0.3;
                text-decoration: line-through;
            }

            .legend-color {
                width: 10px;
                height: 10px;
                border-radius: 2px;
            }

            .canvas-container {
                position: relative;
                width: 100%;
                height: 280px;
            }

            canvas {
                display: block;
                width: 100%;
                height: 100%;
            }

            /* Tooltip flottant sur le Canvas */
            .chart-tooltip {
                position: absolute;
                display: none;
                pointer-events: none;
                background: rgba(6, 13, 8, 0.95);
                border: 1px solid var(--accent-gold);
                border-radius: var(--radius);
                padding: 8px 12px;
                font-size: 0.78rem;
                color: var(--text);
                z-index: 10;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.8);
                transform: translate(-50%, -120%);
                white-space: nowrap;
            }

            .chart-tooltip-title {
                font-weight: 700;
                color: var(--accent-gold);
                margin-bottom: 4px;
                border-bottom: 1px solid var(--border-subtle);
                padding-bottom: 2px;
            }

            /* Deuxième rangée : Donut Sources & Appareils */
            .double-grid {
                display: grid;
                grid-template-columns: 1.4fr 1fr;
                gap: 1.5rem;
                margin-bottom: 1.5rem;
            }

            @media (max-width: 900px) {
                .double-grid { grid-template-columns: 1fr; }
            }

            /* Tableaux */
            .table-container {
                overflow-x: auto;
                margin-top: 0.5rem;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.88rem;
            }

            th, td {
                padding: 0.75rem 0.85rem;
                text-align: left;
                border-bottom: 1px solid var(--border-subtle);
            }

            th {
                color: var(--text-muted);
                font-size: 0.76rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                cursor: pointer;
                user-select: none;
                transition: color 0.2s;
                position: relative;
            }

            th:hover {
                color: var(--accent-gold);
            }

            th .sort-icon {
                font-size: 0.65rem;
                margin-left: 4px;
                color: var(--accent-gold);
            }

            tr:hover td {
                background: rgba(212, 175, 55, 0.03);
            }

            /* Badges */
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: var(--radius);
                font-size: 0.74rem;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            .badge-cv { background: rgba(212, 175, 55, 0.15); color: var(--accent-gold); border: 1px solid rgba(212, 175, 55, 0.4); }
            .badge-game { background: rgba(155, 89, 182, 0.15); color: #d2b4de; border: 1px solid rgba(155, 89, 182, 0.4); }
            .badge-egg { background: rgba(46, 204, 113, 0.15); color: #58d68d; border: 1px solid rgba(46, 204, 113, 0.4); }
            .badge-contact { background: rgba(52, 152, 219, 0.15); color: #85c1e9; border: 1px solid rgba(52, 152, 219, 0.4); }
            .badge-page { background: rgba(255, 255, 255, 0.08); color: var(--text); border: 1px solid rgba(255, 255, 255, 0.15); }
            .badge-project { background: rgba(230, 126, 34, 0.15); color: #f5b041; border: 1px solid rgba(230, 126, 34, 0.4); }

            .tag-recruiter {
                color: var(--accent-gold-light);
                font-weight: 700;
                background: rgba(212, 175, 55, 0.12);
                border: 1px solid rgba(212, 175, 55, 0.35);
                padding: 2px 8px;
                border-radius: var(--radius);
                display: inline-block;
            }

            /* Barre de recherche et filtres de table */
            .table-toolbar {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 0.75rem;
            }

            .search-box {
                position: relative;
                flex-grow: 1;
                max-width: 320px;
            }

            .search-box input {
                width: 100%;
                padding: 6px 10px 6px 28px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid var(--border-subtle);
                border-radius: var(--radius);
                color: var(--text);
                font-size: 0.82rem;
                outline: none;
            }

            .search-box input:focus {
                border-color: var(--accent-gold);
            }

            .search-box::before {
                content: "🔍";
                position: absolute;
                left: 8px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 0.7rem;
                opacity: 0.6;
            }

            .filter-select {
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid var(--border-subtle);
                color: var(--text);
                padding: 6px 10px;
                border-radius: var(--radius);
                font-size: 0.82rem;
                outline: none;
                cursor: pointer;
            }

            /* Générateur de Liens Trackés */
            .generator-card {
                background: linear-gradient(135deg, rgba(12, 26, 17, 0.95) 0%, rgba(20, 42, 28, 0.95) 100%);
                border: 1px solid var(--accent-gold);
                border-radius: var(--radius);
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            }

            .generator-title {
                font-family: 'Cinzel', serif;
                font-size: 1.1rem;
                color: var(--accent-gold);
                margin-bottom: 0.4rem;
                letter-spacing: 1px;
            }

            .generator-desc {
                font-size: 0.85rem;
                color: var(--text-muted);
                margin-bottom: 1rem;
            }

            .generator-form {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
                align-items: center;
            }

            .generator-input {
                flex-grow: 1;
                min-width: 220px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                color: #fff;
                font-size: 0.9rem;
                outline: none;
            }

            .generator-input:focus {
                border-color: var(--accent-gold);
                box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
            }

            .generator-result {
                margin-top: 1rem;
                padding: 0.75rem 1rem;
                background: rgba(0, 0, 0, 0.6);
                border: 1px dashed var(--border);
                border-radius: var(--radius);
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                gap: 0.75rem;
            }

            .generator-url {
                font-family: monospace;
                color: var(--accent-gold-light);
                font-size: 0.9rem;
                word-break: break-all;
            }

            .copy-feedback {
                font-size: 0.78rem;
                color: var(--accent-green);
                display: none;
                margin-left: 6px;
            }

            .footer-info {
                text-align: center;
                color: var(--text-muted);
                font-size: 0.78rem;
                margin-top: 2rem;
                letter-spacing: 0.5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Top Bar -->
            <header class="top-bar">
                <div class="site-identity">
                    <div>
                        <h1 class="site-title">QB. Analytics</h1>
                        <p class="site-tagline">Tableau de bord de tracking souverain & conforme RGPD</p>
                    </div>
                </div>
                <div class="actions-bar">
                    <button class="btn" onclick="refreshData()" title="Recharger les données sans rafraîchir la page">🔄 Actualiser</button>
                    <a href="track.php?format=csv" class="btn" title="Télécharger l'activité au format CSV">📥 Export CSV</a>
                    <a href="track.php?format=json" class="btn" title="Télécharger les statistiques brutes en JSON">📋 Export JSON</a>
                    <a href="../index.html" class="btn" target="_blank" title="Ouvrir le portfolio">🌐 Voir le site</a>
                    <a href="track.php?action=logout" class="btn btn-danger" title="Verrouiller l'accès">🚪 Quitter</a>
                </div>
            </header>

            <!-- Barre de Filtre Temporel -->
            <section class="time-filter-bar">
                <div class="time-filter-label">Période d'analyse</div>
                <div class="time-pills">
                    <button class="time-pill" data-period="today" onclick="setPeriod('today')">Aujourd'hui</button>
                    <button class="time-pill active" data-period="7d" onclick="setPeriod('7d')">7 derniers jours</button>
                    <button class="time-pill" data-period="30d" onclick="setPeriod('30d')">30 derniers jours</button>
                    <button class="time-pill" data-period="all" onclick="setPeriod('all')">Tout l'historique</button>
                </div>
            </section>

            <!-- Grille de Métriques Clés (KPIs) -->
            <section class="kpi-grid">
                <div class="card">
                    <div class="card-title">Pages Vues <span>👁️</span></div>
                    <div class="card-value" id="kpi-pageviews">0</div>
                    <div class="card-sub" id="kpi-pageviews-sub">Sur la période</div>
                </div>
                <div class="card">
                    <div class="card-title">Visiteurs Uniques <span>👥</span></div>
                    <div class="card-value" id="kpi-visitors">0</div>
                    <div class="card-sub" id="kpi-visitors-sub">Estimation IP anonyme</div>
                </div>
                <div class="card">
                    <div class="card-title">CV Téléchargés <span>📄</span></div>
                    <div class="card-value" id="kpi-cv-downloads">0</div>
                    <div class="card-sub" id="kpi-cv-rate">Taux conv. : 0%</div>
                </div>
                <div class="card">
                    <div class="card-title">CV Vus (Web) <span>🎓</span></div>
                    <div class="card-value" id="kpi-cv-views">0</div>
                    <div class="card-sub">Page cv.html</div>
                </div>
                <div class="card">
                    <div class="card-title">Jeux Lancés <span>🎮</span></div>
                    <div class="card-value" id="kpi-games">0</div>
                    <div class="card-sub">Arcade & Vectrex</div>
                </div>
                <div class="card">
                    <div class="card-title">Contacts & Réseaux <span>✉️</span></div>
                    <div class="card-value" id="kpi-contacts">0</div>
                    <div class="card-sub">Email, Tel, LinkedIn</div>
                </div>
            </section>

            <!-- Graphique Principal : Activité Temporelle -->
            <section class="card chart-card">
                <div class="chart-header">
                    <h2 class="chart-title">Évolution de l'Activité</h2>
                    <div class="chart-legend" id="chart-legend">
                        <div class="legend-item" data-metric="pageviews" onclick="toggleMetric('pageviews')">
                            <span class="legend-color" style="background: var(--accent-gold);"></span>
                            <span>Pages Vues</span>
                        </div>
                        <div class="legend-item" data-metric="cv" onclick="toggleMetric('cv')">
                            <span class="legend-color" style="background: var(--accent-green);"></span>
                            <span>CV (PDF + Web)</span>
                        </div>
                        <div class="legend-item" data-metric="games" onclick="toggleMetric('games')">
                            <span class="legend-color" style="background: var(--accent-purple);"></span>
                            <span>Jeux d'Arcade</span>
                        </div>
                        <div class="legend-item" data-metric="contacts" onclick="toggleMetric('contacts')">
                            <span class="legend-color" style="background: var(--accent-blue);"></span>
                            <span>Contacts</span>
                        </div>
                    </div>
                </div>
                <div class="canvas-container">
                    <canvas id="activityCanvas"></canvas>
                    <div id="chartTooltip" class="chart-tooltip"></div>
                </div>
            </section>

            <!-- Générateur de Liens Personnalisés pour Recruteurs -->
            <section class="generator-card">
                <h2 class="generator-title">🎯 Générateur de Liens de Suivi (Recruteurs & Entreprises)</h2>
                <p class="generator-desc">Créez un lien unique à envoyer à une entreprise ou un contact. Dès qu'elle cliquera dessus, son nom s'affichera dans vos statistiques avec le détail de ses actions (téléchargement de CV, projets consultés, etc.).</p>
                <div class="generator-form">
                    <input type="text" id="genName" class="generator-input" placeholder="Nom de l'entreprise ou contact (ex: Ubisoft, Canal+, Julie...)" oninput="updateGeneratedLink()">
                    <select id="genDest" class="filter-select" onchange="updateGeneratedLink()">
                        <option value="">Accueil du portfolio</option>
                        <option value="cv.html">Page du CV interactif</option>
                        <option value="#projects">Section Projets</option>
                        <option value="#passions">Section Créations Vidéos</option>
                    </select>
                </div>
                <div class="generator-result" id="genResultBox">
                    <div class="generator-url" id="generatedUrl">https://www.quentinbeaud.com/</div>
                    <div>
                        <button class="btn btn-primary" onclick="copyGeneratedLink()">📋 Copier le lien</button>
                        <span id="copyFeedback" class="copy-feedback">✓ Copié !</span>
                    </div>
                </div>
            </section>

            <!-- Double Grille : Sources & Appareils -->
            <section class="double-grid">
                <!-- Sources & Referrers -->
                <div class="card">
                    <div class="chart-header">
                        <h2 class="chart-title">Sources de Trafic & Recruteurs</h2>
                        <span class="card-sub" id="sources-count">0 sources</span>
                    </div>
                    <div class="table-container">
                        <table id="table-sources">
                            <thead>
                                <tr>
                                    <th onclick="sortSourcesTable(0, 'string')">Source <span class="sort-icon">▲▼</span></th>
                                    <th onclick="sortSourcesTable(1, 'number')">Visites <span class="sort-icon">▲▼</span></th>
                                    <th onclick="sortSourcesTable(2, 'number')">CV Téléchargé <span class="sort-icon">▲▼</span></th>
                                    <th onclick="sortSourcesTable(3, 'number')">Contacts <span class="sort-icon">▲▼</span></th>
                                </tr>
                            </thead>
                            <tbody id="sources-table-body">
                                <tr><td colspan="4" style="color: var(--text-muted); text-align: center;">Chargement...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Répartition des Appareils -->
                <div class="card">
                    <div class="chart-header">
                        <h2 class="chart-title">Appareils Utilisés</h2>
                    </div>
                    <div class="canvas-container" style="height: 180px;">
                        <canvas id="devicesCanvas"></canvas>
                    </div>
                    <div style="display: flex; justify-content: space-around; margin-top: 1rem; font-size: 0.85rem; text-align: center;" id="devices-breakdown">
                        <div>
                            <div style="color: var(--text-muted);">🖥️ Desktop</div>
                            <strong id="device-desktop-val" style="color: var(--accent-gold);">0%</strong>
                        </div>
                        <div>
                            <div style="color: var(--text-muted);">📱 Mobile</div>
                            <strong id="device-mobile-val" style="color: var(--accent-green);">0%</strong>
                        </div>
                        <div>
                            <div style="color: var(--text-muted);">📟 Tablette</div>
                            <strong id="device-tablet-val" style="color: var(--accent-purple);">0%</strong>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Journal d'Activité Récent -->
            <section class="card">
                <div class="chart-header">
                    <h2 class="chart-title">Journal d'Activité en Direct</h2>
                    <span class="card-sub" id="recent-count">0 événements</span>
                </div>
                
                <div class="table-toolbar">
                    <div class="search-box">
                        <input type="text" id="recentSearch" placeholder="Filtrer (ex: cv, ubisoft, mobile...)" oninput="filterRecentTable()">
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <select id="eventFilter" class="filter-select" onchange="filterRecentTable()">
                            <option value="all">Tous les événements</option>
                            <option value="cv">📄 CV uniquement</option>
                            <option value="page_view">👁️ Pages vues</option>
                            <option value="project_click">⚔️ Clics Projets</option>
                            <option value="game">🎮 Mini-jeux</option>
                            <option value="contact">✉️ Contacts</option>
                            <option value="easter_egg">🥚 Easter eggs</option>
                        </select>
                        <select id="recentLimit" class="filter-select" onchange="filterRecentTable()">
                            <option value="25">25 lignes</option>
                            <option value="50" selected>50 lignes</option>
                            <option value="100">100 lignes</option>
                            <option value="9999">Tout afficher</option>
                        </select>
                    </div>
                </div>

                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table id="table-recent">
                        <thead>
                            <tr>
                                <th onclick="sortRecentTable(0, 'date')">Date & Heure <span class="sort-icon">▲▼</span></th>
                                <th onclick="sortRecentTable(1, 'string')">Événement <span class="sort-icon">▲▼</span></th>
                                <th>Détails de l'action</th>
                                <th onclick="sortRecentTable(3, 'string')">Source <span class="sort-icon">▲▼</span></th>
                                <th onclick="sortRecentTable(4, 'string')">Appareil <span class="sort-icon">▲▼</span></th>
                            </tr>
                        </thead>
                        <tbody id="recent-table-body">
                            <tr><td colspan="5" style="color: var(--text-muted); text-align: center;">Chargement...</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <footer class="footer-info">
                Analytics souverain Quentin Beaud // Stockage local sans cookies tiers // Conforme RGPD
            </footer>
        </div>

        <script>
            // Données brutes injectées par PHP
            let rawData = <?= json_encode($stats, JSON_UNESCAPED_UNICODE) ?>;
            let currentPeriod = '7d';
            let enabledMetrics = { pageviews: true, cv: true, games: true, contacts: true };
            let filteredRecentEvents = [];
            let sourcesSortState = { col: 1, dir: 'desc' };
            let recentSortState = { col: 0, dir: 'desc' };

            // Base URL pour le générateur de lien
            const currentHost = window.location.origin + window.location.pathname.replace(/\/api\/track\.php.*$/, '');

            // Initialisation
            document.addEventListener('DOMContentLoaded', () => {
                updateGeneratedLink();
                renderAll();
                window.addEventListener('resize', debounce(() => {
                    drawActivityChart();
                    drawDevicesChart();
                }, 150));
            });

            function debounce(func, wait) {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), wait);
                };
            }

            // Changement de période
            function setPeriod(period) {
                currentPeriod = period;
                document.querySelectorAll('.time-pill').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.period === period);
                });
                renderAll();
            }

            // Actualisation asynchrone sans rechargement de page
            function refreshData() {
                fetch('track.php?format=json')
                    .then(res => res.json())
                    .then(data => {
                        rawData = data;
                        renderAll();
                    })
                    .catch(() => location.reload());
            }

            // Rendu global
            function renderAll() {
                const filteredData = aggregateDataForPeriod(currentPeriod);
                renderKPIs(filteredData);
                drawActivityChart(filteredData.timeline);
                drawDevicesChart(filteredData.devices);
                renderSourcesTable(filteredData.sources);
                filterRecentTable();
            }

            // Agrégation temporelle des données
            function aggregateDataForPeriod(period) {
                const today = new Date();
                const daily = rawData.daily || {};
                const recent = rawData.recent || [];
                const referrersDetail = rawData.referrers_detail || {};

                let startDate = null;
                if (period === 'today') {
                    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                } else if (period === '7d') {
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 6);
                } else if (period === '30d') {
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 29);
                }

                // Génération des dates de la période
                const dates = [];
                if (startDate) {
                    const cur = new Date(startDate);
                    while (cur <= today) {
                        const y = cur.getFullYear();
                        const m = String(cur.getMonth() + 1).padStart(2, '0');
                        const d = String(cur.getDate()).padStart(2, '0');
                        dates.push(`${y}-${m}-${d}`);
                        cur.setDate(cur.getDate() + 1);
                    }
                } else {
                    // 'all' : toutes les clés de daily
                    const allDates = Object.keys(daily).sort();
                    if (allDates.length > 0) {
                        dates.push(...allDates);
                    } else {
                        const y = today.getFullYear();
                        const m = String(today.getMonth() + 1).padStart(2, '0');
                        const d = String(today.getDate()).padStart(2, '0');
                        dates.push(`${y}-${m}-${d}`);
                    }
                }

                let pageviews = 0;
                let cvDownloads = 0;
                let cvViews = 0;
                let games = 0;
                let contacts = 0;
                let easterEggs = 0;
                let projects = 0;
                let uniqueVisitorsSet = new Set();
                const devices = { desktop: 0, mobile: 0, tablet: 0 };
                const sources = {};
                const timeline = [];

                dates.forEach(dateStr => {
                    const dayData = daily[dateStr] || {};
                    const pv = dayData.pageviews || 0;
                    const cvD = dayData.cv_downloads !== undefined ? dayData.cv_downloads : (dayData.cv || 0);
                    const cvV = dayData.cv_views || 0;
                    const g = dayData.games || 0;
                    const c = dayData.contacts || 0;
                    const e = dayData.easter_eggs || 0;
                    const p = dayData.projects || 0;

                    pageviews += pv;
                    cvDownloads += cvD;
                    cvViews += cvV;
                    games += g;
                    contacts += c;
                    easterEggs += e;
                    projects += p;

                    if (dayData.visitors && typeof dayData.visitors === 'object') {
                        Object.keys(dayData.visitors).forEach(v => uniqueVisitorsSet.add(dateStr + '_' + v));
                    }

                    if (dayData.devices) {
                        devices.desktop += dayData.devices.desktop || 0;
                        devices.mobile += dayData.devices.mobile || 0;
                        devices.tablet += dayData.devices.tablet || 0;
                    }

                    if (dayData.referrers) {
                        Object.entries(dayData.referrers).forEach(([ref, count]) => {
                            if (!sources[ref]) sources[ref] = { visits: 0, cv: 0, contacts: 0 };
                            sources[ref].visits += count;
                        });
                    }

                    timeline.push({
                        date: dateStr,
                        pageviews: pv,
                        cv: cvD + cvV,
                        cv_downloads: cvD,
                        cv_views: cvV,
                        games: g,
                        contacts: c
                    });
                });

                // Si 'all' et pas de détail fin dans daily pour devices/sources, utiliser les totaux
                if (period === 'all') {
                    if (devices.desktop === 0 && devices.mobile === 0 && rawData.devices) {
                        devices.desktop = rawData.devices.desktop || 0;
                        devices.mobile = rawData.devices.mobile || 0;
                        devices.tablet = rawData.devices.tablet || 0;
                    }
                    if (Object.keys(sources).length === 0 && rawData.referrers) {
                        Object.entries(rawData.referrers).forEach(([ref, count]) => {
                            sources[ref] = { visits: count, cv: 0, contacts: 0 };
                        });
                    }
                    pageviews = Math.max(pageviews, (rawData.summary ? rawData.summary.pageviews : 0) || 0);
                    cvDownloads = Math.max(cvDownloads, (rawData.summary ? rawData.summary.cv_downloads : 0) || 0);
                    cvViews = Math.max(cvViews, (rawData.summary ? rawData.summary.cv_views : 0) || 0);
                    games = Math.max(games, (rawData.summary ? rawData.summary.games_played : 0) || 0);
                    contacts = Math.max(contacts, (rawData.summary ? rawData.summary.contacts : 0) || 0);
                }

                // Enrichissement des sources depuis referrers_detail
                Object.entries(referrersDetail).forEach(([ref, det]) => {
                    if (!sources[ref]) {
                        if (period === 'all') {
                            sources[ref] = { visits: det.visits || 0, cv: (det.cv_downloads || 0) + (det.cv_views || 0), contacts: det.contacts || 0 };
                        }
                    } else {
                        sources[ref].cv = Math.max(sources[ref].cv, (det.cv_downloads || 0) + (det.cv_views || 0));
                        sources[ref].contacts = Math.max(sources[ref].contacts, det.contacts || 0);
                    }
                });

                const totalVisitors = uniqueVisitorsSet.size > 0 ? uniqueVisitorsSet.size : Math.round(pageviews * 0.7) || (pageviews > 0 ? 1 : 0);

                return {
                    pageviews,
                    visitors: totalVisitors,
                    cvDownloads,
                    cvViews,
                    games,
                    contacts,
                    easterEggs,
                    projects,
                    devices,
                    sources,
                    timeline
                };
            }

            // Rendu des Cartes KPIs
            function renderKPIs(data) {
                document.getElementById('kpi-pageviews').textContent = formatNumber(data.pageviews);
                document.getElementById('kpi-visitors').textContent = formatNumber(data.visitors);
                document.getElementById('kpi-cv-downloads').textContent = formatNumber(data.cvDownloads);
                document.getElementById('kpi-cv-views').textContent = formatNumber(data.cvViews);
                document.getElementById('kpi-games').textContent = formatNumber(data.games);
                document.getElementById('kpi-contacts').textContent = formatNumber(data.contacts);

                const totalCv = data.cvDownloads + data.cvViews;
                const convRate = data.visitors > 0 ? ((totalCv / data.visitors) * 100).toFixed(1) : 0;
                document.getElementById('kpi-cv-rate').textContent = `Taux conv. CV : ${convRate}%`;
            }

            function formatNumber(num) {
                return new Intl.NumberFormat('fr-FR').format(num || 0);
            }

            // -------------------------------------------------------------
            // GRAPHIQUE 1 : ACTIVITÉ TEMPORELLE (CANVAS 2D ULTRA-HD)
            // -------------------------------------------------------------
            let cachedTimeline = [];

            function drawActivityChart(timelineData) {
                if (timelineData) cachedTimeline = timelineData;
                const canvas = document.getElementById('activityCanvas');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();

                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);

                const width = rect.width;
                const height = rect.height;

                ctx.clearRect(0, 0, width, height);

                const data = cachedTimeline;
                if (!data || data.length === 0) {
                    ctx.fillStyle = '#8fa693';
                    ctx.font = '13px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Aucune donnée pour cette période.', width / 2, height / 2);
                    return;
                }

                const padding = { top: 20, right: 25, bottom: 35, left: 45 };
                const plotWidth = width - padding.left - padding.right;
                const plotHeight = height - padding.top - padding.bottom;

                // Trouver la valeur maximale pour l'axe Y
                let maxVal = 5;
                data.forEach(d => {
                    if (enabledMetrics.pageviews && d.pageviews > maxVal) maxVal = d.pageviews;
                    if (enabledMetrics.cv && d.cv > maxVal) maxVal = d.cv;
                    if (enabledMetrics.games && d.games > maxVal) maxVal = d.games;
                    if (enabledMetrics.contacts && d.contacts > maxVal) maxVal = d.contacts;
                });
                maxVal = Math.ceil(maxVal * 1.15);

                // Lignes de repère horizontales
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
                ctx.lineWidth = 1;
                ctx.fillStyle = '#8fa693';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'right';

                const gridSteps = 4;
                for (let i = 0; i <= gridSteps; i++) {
                    const yVal = Math.round((maxVal / gridSteps) * i);
                    const yPos = padding.top + plotHeight - (yVal / maxVal) * plotHeight;

                    ctx.beginPath();
                    ctx.moveTo(padding.left, yPos);
                    ctx.lineTo(width - padding.right, yPos);
                    ctx.stroke();

                    ctx.fillText(yVal, padding.left - 8, yPos + 4);
                }

                // Dates sur l'axe X
                ctx.textAlign = 'center';
                const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth / 2;
                const labelSkip = Math.ceil(data.length / 7);

                data.forEach((d, idx) => {
                    if (idx % labelSkip === 0 || idx === data.length - 1) {
                        const x = padding.left + idx * stepX;
                        const parts = d.date.split('-');
                        const label = `${parts[2]}/${parts[1]}`;
                        ctx.fillText(label, x, height - 10);
                    }
                });

                // Fonction de tracé d'une métrique
                function drawMetricLine(metricKey, strokeColor, fillColor) {
                    if (!enabledMetrics[metricKey]) return;

                    ctx.beginPath();
                    data.forEach((d, idx) => {
                        const x = padding.left + idx * stepX;
                        const y = padding.top + plotHeight - (d[metricKey] / maxVal) * plotHeight;
                        if (idx === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });

                    // Contour de la courbe
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 2.5;
                    ctx.stroke();

                    // Remplissage dégradé sous la courbe
                    if (fillColor) {
                        const lastX = padding.left + (data.length - 1) * stepX;
                        const firstX = padding.left;
                        const bottomY = padding.top + plotHeight;

                        ctx.lineTo(lastX, bottomY);
                        ctx.lineTo(firstX, bottomY);
                        ctx.closePath();

                        const grad = ctx.createLinearGradient(0, padding.top, 0, bottomY);
                        grad.addColorStop(0, fillColor);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.fill();
                    }

                    // Points sur les sommets
                    data.forEach((d, idx) => {
                        const x = padding.left + idx * stepX;
                        const y = padding.top + plotHeight - (d[metricKey] / maxVal) * plotHeight;

                        ctx.beginPath();
                        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
                        ctx.fillStyle = strokeColor;
                        ctx.fill();
                        ctx.strokeStyle = '#060d08';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    });
                }

                // Tracé dans l'ordre (Pages Vues en fond, puis interactions au premier plan)
                drawMetricLine('pageviews', '#d4af37', 'rgba(212, 175, 55, 0.18)');
                drawMetricLine('cv', '#2ecc71', 'rgba(46, 204, 113, 0.12)');
                drawMetricLine('games', '#9b59b6', null);
                drawMetricLine('contacts', '#3498db', null);
            }

            // Gestion du survol / Tooltip interactif sur le Canvas
            const actCanvas = document.getElementById('activityCanvas');
            const tooltip = document.getElementById('chartTooltip');

            actCanvas.addEventListener('mousemove', (e) => {
                if (!cachedTimeline || cachedTimeline.length === 0) return;

                const rect = actCanvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const width = rect.width;
                const padding = { top: 20, right: 25, bottom: 35, left: 45 };
                const plotWidth = width - padding.left - padding.right;

                if (mouseX < padding.left || mouseX > width - padding.right) {
                    tooltip.style.display = 'none';
                    return;
                }

                const stepX = cachedTimeline.length > 1 ? plotWidth / (cachedTimeline.length - 1) : plotWidth;
                const idx = Math.min(Math.max(0, Math.round((mouseX - padding.left) / stepX)), cachedTimeline.length - 1);
                const item = cachedTimeline[idx];

                if (!item) return;

                const parts = item.date.split('-');
                const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

                tooltip.innerHTML = `
                    <div class="chart-tooltip-title">${formattedDate}</div>
                    <div style="color: #d4af37;">👁️ Pages vues : <strong>${item.pageviews}</strong></div>
                    <div style="color: #2ecc71;">📄 CV consultés / téléchargés : <strong>${item.cv}</strong></div>
                    <div style="color: #9b59b6;">🎮 Jeux d'arcade : <strong>${item.games}</strong></div>
                    <div style="color: #3498db;">✉️ Contacts : <strong>${item.contacts}</strong></div>
                `;

                const posX = padding.left + idx * stepX;
                tooltip.style.left = `${posX}px`;
                tooltip.style.top = `${rect.height / 2}px`;
                tooltip.style.display = 'block';
            });

            actCanvas.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });

            function toggleMetric(key) {
                enabledMetrics[key] = !enabledMetrics[key];
                document.querySelectorAll('.legend-item').forEach(el => {
                    if (el.dataset.metric === key) {
                        el.classList.toggle('disabled', !enabledMetrics[key]);
                    }
                });
                drawActivityChart();
            }

            // -------------------------------------------------------------
            // GRAPHIQUE 2 : RÉPARTITION APPAREILS (DONUT CHART)
            // -------------------------------------------------------------
            function drawDevicesChart(devData) {
                const canvas = document.getElementById('devicesCanvas');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();

                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);

                const width = rect.width;
                const height = rect.height;
                ctx.clearRect(0, 0, width, height);

                const desktop = (devData ? devData.desktop : 0) || 0;
                const mobile = (devData ? devData.mobile : 0) || 0;
                const tablet = (devData ? devData.tablet : 0) || 0;
                const total = desktop + mobile + tablet;

                const dPct = total > 0 ? Math.round((desktop / total) * 100) : 0;
                const mPct = total > 0 ? Math.round((mobile / total) * 100) : 0;
                const tPct = total > 0 ? 100 - dPct - mPct : 0;

                document.getElementById('device-desktop-val').textContent = `${dPct}%`;
                document.getElementById('device-mobile-val').textContent = `${mPct}%`;
                document.getElementById('device-tablet-val').textContent = `${tPct}%`;

                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(centerX, centerY) - 15;
                const innerRadius = radius * 0.65;

                if (total === 0) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
                    ctx.lineWidth = radius - innerRadius;
                    ctx.stroke();
                    return;
                }

                const slices = [
                    { val: desktop, color: '#d4af37' },
                    { val: mobile, color: '#2ecc71' },
                    { val: tablet, color: '#9b59b6' }
                ];

                let curAngle = -Math.PI / 2;
                slices.forEach(slice => {
                    if (slice.val === 0) return;
                    const sliceAngle = (slice.val / total) * Math.PI * 2;

                    ctx.beginPath();
                    ctx.arc(centerX, centerY, (radius + innerRadius) / 2, curAngle, curAngle + sliceAngle);
                    ctx.strokeStyle = slice.color;
                    ctx.lineWidth = radius - innerRadius;
                    ctx.stroke();

                    curAngle += sliceAngle;
                });

                // Total au centre
                ctx.fillStyle = '#f0f4f1';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(total, centerX, centerY - 4);
                ctx.font = '10px sans-serif';
                ctx.fillStyle = '#8fa693';
                ctx.fillText('visites', centerX, centerY + 12);
            }

            // -------------------------------------------------------------
            // TABLEAU DES SOURCES & TRI
            // -------------------------------------------------------------
            let cachedSources = [];

            function renderSourcesTable(sourcesDict) {
                const tbody = document.getElementById('sources-table-body');
                if (!tbody) return;

                cachedSources = Object.entries(sourcesDict || {}).map(([source, data]) => ({
                    source,
                    visits: data.visits || 0,
                    cv: data.cv || 0,
                    contacts: data.contacts || 0
                }));

                document.getElementById('sources-count').textContent = `${cachedSources.length} source(s)`;
                applySourcesSortAndRender();
            }

            function sortSourcesTable(colIdx, type) {
                if (sourcesSortState.col === colIdx) {
                    sourcesSortState.dir = sourcesSortState.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    sourcesSortState.col = colIdx;
                    sourcesSortState.dir = 'desc';
                }
                applySourcesSortAndRender();
            }

            function applySourcesSortAndRender() {
                const { col, dir } = sourcesSortState;
                cachedSources.sort((a, b) => {
                    let vA, vB;
                    if (col === 0) { vA = a.source.toLowerCase(); vB = b.source.toLowerCase(); }
                    else if (col === 1) { vA = a.visits; vB = b.visits; }
                    else if (col === 2) { vA = a.cv; vB = b.cv; }
                    else if (col === 3) { vA = a.contacts; vB = b.contacts; }

                    if (vA < vB) return dir === 'asc' ? -1 : 1;
                    if (vA > vB) return dir === 'asc' ? 1 : -1;
                    return 0;
                });

                const tbody = document.getElementById('sources-table-body');
                if (cachedSources.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="color: var(--text-muted); text-align: center;">Aucune visite enregistrée pour cette période.</td></tr>';
                    return;
                }

                tbody.innerHTML = cachedSources.map(s => {
                    const isRecruiter = s.source.startsWith('Lien :');
                    const srcLabel = isRecruiter 
                        ? `<span class="tag-recruiter">${escapeHtml(s.source)}</span>` 
                        : `<strong>${escapeHtml(s.source)}</strong>`;

                    const cvBadge = s.cv > 0 
                        ? `<span class="badge badge-cv">✓ ${s.cv} CV</span>` 
                        : `<span style="color: var(--text-muted);">0</span>`;

                    const contactBadge = s.contacts > 0 
                        ? `<span class="badge badge-contact">✓ ${s.contacts}</span>` 
                        : `<span style="color: var(--text-muted);">0</span>`;

                    return `
                        <tr>
                            <td>${srcLabel}</td>
                            <td><strong>${formatNumber(s.visits)}</strong></td>
                            <td>${cvBadge}</td>
                            <td>${contactBadge}</td>
                        </tr>
                    `;
                }).join('');
            }

            // -------------------------------------------------------------
            // TABLEAU DU JOURNAL D'ACTIVITÉ & RECHERCHE
            // -------------------------------------------------------------
            function filterRecentTable() {
                const search = ((document.getElementById('recentSearch') ? document.getElementById('recentSearch').value : '') || '').toLowerCase().trim();
                const eventFilter = (document.getElementById('eventFilter') ? document.getElementById('eventFilter').value : 'all') || 'all';
                const limit = parseInt((document.getElementById('recentLimit') ? document.getElementById('recentLimit').value : '50') || '50', 10);

                const allRecent = rawData.recent || [];

                filteredRecentEvents = allRecent.filter(act => {
                    const ev = act.event || '';
                    if (eventFilter === 'cv' && !ev.includes('cv')) return false;
                    if (eventFilter === 'page_view' && ev !== 'page_view') return false;
                    if (eventFilter === 'project_click' && ev !== 'project_click') return false;
                    if (eventFilter === 'game' && !ev.includes('game')) return false;
                    if (eventFilter === 'contact' && !ev.includes('contact') && !ev.includes('social')) return false;
                    if (eventFilter === 'easter_egg' && !ev.includes('egg') && !ev.includes('vectrex')) return false;

                    if (search) {
                        const str = (
                            (act.time || '') + ' ' + 
                            ev + ' ' + 
                            (act.ref || '') + ' ' + 
                            (act.device || '') + ' ' + 
                            JSON.stringify(act.props || '')
                        ).toLowerCase();
                        if (!str.includes(search)) return false;
                    }
                    return true;
                });

                document.getElementById('recent-count').textContent = `${filteredRecentEvents.length} événement(s)`;
                applyRecentSortAndRender(limit);
            }

            function sortRecentTable(colIdx, type) {
                if (recentSortState.col === colIdx) {
                    recentSortState.dir = recentSortState.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    recentSortState.col = colIdx;
                    recentSortState.dir = 'desc';
                }
                const limit = parseInt((document.getElementById('recentLimit') ? document.getElementById('recentLimit').value : '50') || '50', 10);
                applyRecentSortAndRender(limit);
            }

            function applyRecentSortAndRender(limit) {
                const { col, dir } = recentSortState;

                filteredRecentEvents.sort((a, b) => {
                    let vA, vB;
                    if (col === 0) { vA = a.time || ''; vB = b.time || ''; }
                    else if (col === 1) { vA = a.event || ''; vB = b.event || ''; }
                    else if (col === 3) { vA = (a.ref || '').toLowerCase(); vB = (b.ref || '').toLowerCase(); }
                    else if (col === 4) { vA = a.device || ''; vB = b.device || ''; }

                    if (vA < vB) return dir === 'asc' ? -1 : 1;
                    if (vA > vB) return dir === 'asc' ? 1 : -1;
                    return 0;
                });

                const tbody = document.getElementById('recent-table-body');
                const slice = filteredRecentEvents.slice(0, limit);

                if (slice.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="color: var(--text-muted); text-align: center;">Aucun événement ne correspond aux critères.</td></tr>';
                    return;
                }

                tbody.innerHTML = slice.map(act => {
                    const ev = act.event || '';
                    let badgeClass = 'badge-page';
                    let eventLabel = ev;

                    if (ev === 'cv_download') { badgeClass = 'badge-cv'; eventLabel = '📄 Téléchargement CV'; }
                    else if (ev === 'cv_view') { badgeClass = 'badge-cv'; eventLabel = '🎓 Consultation CV'; }
                    else if (ev === 'game_start') { badgeClass = 'badge-game'; eventLabel = '🎮 Lancement Jeu'; }
                    else if (ev === 'contact_click') { badgeClass = 'badge-contact'; eventLabel = '✉️ Clic Contact'; }
                    else if (ev === 'social_click') { badgeClass = 'badge-contact'; eventLabel = '🌐 Clic Réseau'; }
                    else if (ev === 'project_click') { badgeClass = 'badge-project'; eventLabel = '⚔️ Projet GitHub'; }
                    else if (ev.includes('egg')) { badgeClass = 'badge-egg'; eventLabel = '🥚 Easter Egg'; }
                    else if (ev === 'page_view') { badgeClass = 'badge-page'; eventLabel = '👁️ Page Vue'; }

                    let detailsStr = '';
                    if (act.props && typeof act.props === 'object') {
                        const parts = [];
                        if (act.props.format) parts.push(`Format: <strong>${escapeHtml(act.props.format)}</strong>`);
                        if (act.props.game) parts.push(`Jeu: <strong>${escapeHtml(act.props.game)}</strong>`);
                        if (act.props.target) parts.push(`Cible: <strong>${escapeHtml(act.props.target)}</strong>`);
                        if (act.props.project) parts.push(`Projet: <strong>${escapeHtml(act.props.project)}</strong>`);
                        if (act.props.egg) parts.push(`Code: <strong>${escapeHtml(act.props.egg)}</strong>`);
                        if (act.props.url) parts.push(`URL: <em>${escapeHtml(act.props.url)}</em>`);
                        detailsStr = parts.join(' | ') || JSON.stringify(act.props);
                    }

                    const srcStr = act.ref && act.ref.startsWith('Lien :') 
                        ? `<span class="tag-recruiter">${escapeHtml(act.ref)}</span>` 
                        : escapeHtml(act.ref || 'Direct');

                    const devIcon = act.device === 'mobile' ? '📱' : (act.device === 'tablet' ? '📟' : '🖥️');

                    return `
                        <tr>
                            <td style="color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">${escapeHtml(act.time || '')}</td>
                            <td><span class="badge ${badgeClass}">${eventLabel}</span></td>
                            <td>${detailsStr || '—'}</td>
                            <td>${srcStr}</td>
                            <td>${devIcon} ${escapeHtml(act.device || 'desktop')}</td>
                        </tr>
                    `;
                }).join('');
            }

            // -------------------------------------------------------------
            // GÉNÉRATEUR DE LIENS TRACKÉS
            // -------------------------------------------------------------
            function updateGeneratedLink() {
                const name = (document.getElementById('genName') ? document.getElementById('genName').value : '').trim() || '';
                const dest = (document.getElementById('genDest') ? document.getElementById('genDest').value : '') || '';

                let base = currentHost;
                if (!base.endsWith('/')) base += '/';

                let url = base;
                if (dest && !dest.startsWith('#')) {
                    url += dest;
                }

                if (name) {
                    const cleanParam = encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                    const sep = url.includes('?') ? '&' : '?';
                    url += `${sep}ref=${cleanParam}`;
                }

                if (dest && dest.startsWith('#')) {
                    url += dest;
                }

                document.getElementById('generatedUrl').textContent = url;
            }

            function copyGeneratedLink() {
                const text = (document.getElementById('generatedUrl') ? document.getElementById('generatedUrl').textContent : '');
                if (!text) return;

                navigator.clipboard.writeText(text).then(() => {
                    const fb = document.getElementById('copyFeedback');
                    fb.style.display = 'inline';
                    setTimeout(() => { fb.style.display = 'none'; }, 2500);
                }).catch(() => {
                    const temp = document.createElement('input');
                    temp.value = text;
                    document.body.appendChild(temp);
                    temp.select();
                    document.execCommand('copy');
                    document.body.removeChild(temp);
                    const fb = document.getElementById('copyFeedback');
                    fb.style.display = 'inline';
                    setTimeout(() => { fb.style.display = 'none'; }, 2500);
                });
            }

            function escapeHtml(str) {
                if (typeof str !== 'string') return '';
                return str.replace(/[&<>"']/g, m => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                }[m]));
            }
        </script>
    </body>
    </html>
    <?php
    exit;
}

// -------------------------------------------------------------
// 2. ENREGISTREMENT D'UN ÉVÉNEMENT (POST)
// -------------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée. Utilisez POST.']);
    exit;
}

// Vérification Rate-limit
if (!checkTrackRateLimit($clientIp, $rateLimitFile)) {
    http_response_code(429);
    echo json_encode(['error' => 'Trop de requêtes. Veuillez patienter.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!is_array($payload) || empty($payload['event'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Payload invalide.']);
    exit;
}

// Whitelist stricte des événements autorisés
$allowedEvents = [
    'page_view',
    'cv_download',
    'cv_view',
    'game_start',
    'game_complete',
    'easter_egg',
    'idle_milestone',
    'contact_click',
    'social_click',
    'project_click'
];

$event = trim(strval($payload['event']));
if (!in_array($event, $allowedEvents, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Événement non autorisé.']);
    exit;
}

// Nettoyage et assainissement des propriétés
$props = [];
if (!empty($payload['props']) && is_array($payload['props'])) {
    foreach ($payload['props'] as $k => $v) {
        $cleanKey = preg_replace('/[^a-zA-Z0-9_-]/', '', substr(strval($k), 0, 32));
        $cleanVal = preg_replace('/[^\p{L}\p{N}\s_\-.:\/]/u', '', substr(strval($v), 0, 64));
        if (!empty($cleanKey)) {
            $props[$cleanKey] = $cleanVal;
        }
    }
}

// Referrer et Appareil
$referrer = parseReferrer($payload['referrer'] ?? $payload['props']['source'] ?? $_SERVER['HTTP_REFERER'] ?? '');
$device = detectDevice();
$today = date('Y-m-d');
$nowStr = date('Y-m-d H:i:s');
$nowTs = time();

// Hash anonymisé journalier du visiteur (respect RGPD absolu)
$visitorHash = substr(hash('sha256', $clientIp . $today . $serverSecret), 0, 8);

// Chargement du fichier existant
$stats = [
    'summary' => [
        'pageviews' => 0,
        'cv_downloads' => 0,
        'cv_views' => 0,
        'games_played' => 0,
        'easter_eggs' => 0,
        'contacts' => 0,
        'projects' => 0
    ],
    'events' => [],
    'referrers' => [],
    'referrers_detail' => [],
    'devices' => ['desktop' => 0, 'mobile' => 0, 'tablet' => 0],
    'daily' => [],
    'recent' => []
];

if (file_exists($statsFile)) {
    $content = @file_get_contents($statsFile);
    if ($content) {
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            $stats = array_replace_recursive($stats, $decoded);
        }
    }
}

// 1. Mise à jour des compteurs globaux (Summary)
if ($event === 'page_view') $stats['summary']['pageviews'] = ($stats['summary']['pageviews'] ?? 0) + 1;
if ($event === 'cv_download') $stats['summary']['cv_downloads'] = ($stats['summary']['cv_downloads'] ?? 0) + 1;
if ($event === 'cv_view') $stats['summary']['cv_views'] = ($stats['summary']['cv_views'] ?? 0) + 1;
if ($event === 'game_start') $stats['summary']['games_played'] = ($stats['summary']['games_played'] ?? 0) + 1;
if ($event === 'easter_egg') $stats['summary']['easter_eggs'] = ($stats['summary']['easter_eggs'] ?? 0) + 1;
if ($event === 'contact_click' || $event === 'social_click') $stats['summary']['contacts'] = ($stats['summary']['contacts'] ?? 0) + 1;
if ($event === 'project_click') $stats['summary']['projects'] = ($stats['summary']['projects'] ?? 0) + 1;

// 2. Mise à jour des événements détaillés
if (!isset($stats['events'][$event])) $stats['events'][$event] = 0;
$stats['events'][$event]++;

// 3. Mise à jour Referrer classique & détaillé
if (!isset($stats['referrers'][$referrer])) $stats['referrers'][$referrer] = 0;
$stats['referrers'][$referrer]++;

if (!isset($stats['referrers_detail'][$referrer])) {
    $stats['referrers_detail'][$referrer] = [
        'visits' => 0,
        'first_seen' => $nowStr,
        'last_seen' => $nowStr,
        'cv_downloads' => 0,
        'cv_views' => 0,
        'games' => 0,
        'contacts' => 0,
        'projects' => 0
    ];
}
$stats['referrers_detail'][$referrer]['last_seen'] = $nowStr;
if ($event === 'page_view') $stats['referrers_detail'][$referrer]['visits']++;
if ($event === 'cv_download') $stats['referrers_detail'][$referrer]['cv_downloads']++;
if ($event === 'cv_view') $stats['referrers_detail'][$referrer]['cv_views']++;
if ($event === 'game_start') $stats['referrers_detail'][$referrer]['games']++;
if ($event === 'contact_click' || $event === 'social_click') $stats['referrers_detail'][$referrer]['contacts']++;
if ($event === 'project_click') $stats['referrers_detail'][$referrer]['projects']++;

// 4. Mise à jour Device
if (!isset($stats['devices'][$device])) $stats['devices'][$device] = 0;
$stats['devices'][$device]++;

// 5. Mise à jour Journalière
if (!isset($stats['daily'][$today])) {
    $stats['daily'][$today] = [
        'pageviews' => 0,
        'visitors' => [],
        'cv_downloads' => 0,
        'cv_views' => 0,
        'games' => 0,
        'contacts' => 0,
        'easter_eggs' => 0,
        'projects' => 0,
        'referrers' => [],
        'devices' => ['desktop' => 0, 'mobile' => 0, 'tablet' => 0]
    ];
}

// Rétrocompatibilité avec les anciennes structures daily
if (!isset($stats['daily'][$today]['referrers'])) $stats['daily'][$today]['referrers'] = [];
if (!isset($stats['daily'][$today]['devices'])) $stats['daily'][$today]['devices'] = ['desktop' => 0, 'mobile' => 0, 'tablet' => 0];
if (!isset($stats['daily'][$today]['visitors'])) $stats['daily'][$today]['visitors'] = [];

if ($event === 'page_view') {
    $stats['daily'][$today]['pageviews'] = ($stats['daily'][$today]['pageviews'] ?? 0) + 1;
    $stats['daily'][$today]['visitors'][$visitorHash] = 1;
}
if ($event === 'cv_download') $stats['daily'][$today]['cv_downloads'] = ($stats['daily'][$today]['cv_downloads'] ?? 0) + 1;
if ($event === 'cv_view') $stats['daily'][$today]['cv_views'] = ($stats['daily'][$today]['cv_views'] ?? 0) + 1;
if ($event === 'game_start') $stats['daily'][$today]['games'] = ($stats['daily'][$today]['games'] ?? 0) + 1;
if ($event === 'contact_click' || $event === 'social_click') $stats['daily'][$today]['contacts'] = ($stats['daily'][$today]['contacts'] ?? 0) + 1;
if ($event === 'easter_egg') $stats['daily'][$today]['easter_eggs'] = ($stats['daily'][$today]['easter_eggs'] ?? 0) + 1;
if ($event === 'project_click') $stats['daily'][$today]['projects'] = ($stats['daily'][$today]['projects'] ?? 0) + 1;

if (!isset($stats['daily'][$today]['referrers'][$referrer])) {
    $stats['daily'][$today]['referrers'][$referrer] = 0;
}
$stats['daily'][$today]['referrers'][$referrer]++;

if (!isset($stats['daily'][$today]['devices'][$device])) {
    $stats['daily'][$today]['devices'][$device] = 0;
}
$stats['daily'][$today]['devices'][$device]++;

// Nettoyage de l'historique journalier (> 90 jours)
if (count($stats['daily']) > 90) {
    $stats['daily'] = array_slice($stats['daily'], -90, 90, true);
}

// 6. Liste des événements récents (Garder les 300 derniers événements)
$stats['recent'][] = [
    'time' => $nowStr,
    'ts' => $nowTs,
    'event' => $event,
    'props' => $props,
    'ref' => $referrer,
    'device' => $device,
    'visitor' => $visitorHash
];

if (count($stats['recent']) > 300) {
    $stats['recent'] = array_slice($stats['recent'], -300);
}

// 7. Écriture atomique sécurisée
@file_put_contents($statsFile, json_encode($stats, JSON_UNESCAPED_UNICODE), LOCK_EX);

http_response_code(200);
echo json_encode(['status' => 'success', 'event' => $event]);
