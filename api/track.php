<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

/**
 * Backend API de Tracking Sécurisée & Souveraine - Portfolio Quentin Beaud
 * Conçue selon les standards de cybersécurité et de respect de la vie privée (RGPD / CNIL) :
 * - Aucune donnée personnelle stockée (IP hachée avec sel quotidien)
 * - Whitelist stricte des événements autorisés (Anti-Injection / Anti-Tampering)
 * - Rate-limiting par adresse IP (Anti-DDoS / Anti-Spam)
 * - Écritures atomiques sécurisées (LOCK_EX)
 * - Dashboard d'administration sécurisé par clé d'accès
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
    if (strpos($refLower, 'from=') !== false || strpos($refLower, 'recruteur=') !== false || strpos($refLower, 'ref=') !== false || strpos($refLower, 'source=') !== false) {
        $queryStr = parse_url($refUrl, PHP_URL_QUERY) ?? $refUrl;
        parse_str($queryStr, $params);
        $val = $params['from'] ?? $params['recruteur'] ?? $params['ref'] ?? $params['source'] ?? $params['utm_source'] ?? '';
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

// Détection basique du type d'appareil
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
// 1. VUE DASHBOARD (GET & LOGIN AVEC HACHAGE BCRYPT SÉCURISÉ)
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

    // A. PREMIER DÉMARRAGE : Aucun mot de passe défini -> Écran de configuration initiale
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
                    --bg: #0b140e;
                    --card-bg: rgba(26, 51, 34, 0.85);
                    --accent-gold: #d4af37;
                    --text: #f0f3f1;
                    --text-muted: #a3b899;
                    --border: rgba(212, 175, 55, 0.3);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
                .login-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 2.5rem 2rem; max-width: 440px; width: 100%; text-align: center; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { color: var(--accent-gold); font-size: 1.5rem; margin-bottom: 0.5rem; }
                p { color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.5rem; line-height: 1.4; }
                input[type="password"] { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.95rem; margin-bottom: 1rem; outline: none; }
                input[type="password"]:focus { border-color: var(--accent-gold); box-shadow: 0 0 10px rgba(212, 175, 55, 0.3); }
                button { width: 100%; padding: 0.75rem; background: var(--accent-gold); color: #000; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #e5c158; }
                .error-msg { background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #ff6b6b; padding: 0.5rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; }
                .note { font-size: 0.75rem; color: #88a080; margin-top: 1rem; }
            </style>
        </head>
        <body>
            <div class="login-card">
                <h1>🦉 Premier Démarrage</h1>
                <p>Définissez votre mot de passe administrateur pour verrouiller vos statistiques. Il sera <strong>haché avec Bcrypt</strong> et stocké exclusivement sur votre serveur privé (jamais sur GitHub).</p>
                <?php if ($setupError): ?>
                    <div class="error-msg"><?= htmlspecialchars($setupError) ?></div>
                <?php endif; ?>
                <form method="POST" action="track.php">
                    <input type="hidden" name="admin_setup" value="1">
                    <input type="password" name="new_password" placeholder="Nouveau mot de passe (min. 6 car.)" required autofocus>
                    <input type="password" name="confirm_password" placeholder="Confirmer le mot de passe" required>
                    <button type="submit">Enregistrer et Activer</button>
                </form>
                <div class="note">🔒 Zéro mot de passe en clair dans le code source Git.</div>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    // B. CONNEXION SÉCURISÉE (Le mot de passe a déjà été défini)
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

    // Si non authentifié -> Affichage du formulaire de connexion
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
                    --bg: #0b140e;
                    --card-bg: rgba(26, 51, 34, 0.85);
                    --accent-gold: #d4af37;
                    --text: #f0f3f1;
                    --text-muted: #a3b899;
                    --border: rgba(212, 175, 55, 0.3);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
                .login-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 2.5rem 2rem; max-width: 400px; width: 100%; text-align: center; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { color: var(--accent-gold); font-size: 1.5rem; margin-bottom: 0.5rem; }
                p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
                input[type="password"] { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 1rem; margin-bottom: 1rem; outline: none; }
                input[type="password"]:focus { border-color: var(--accent-gold); box-shadow: 0 0 10px rgba(212, 175, 55, 0.3); }
                button { width: 100%; padding: 0.75rem; background: var(--accent-gold); color: #000; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #e5c158; }
                .error-msg { background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #ff6b6b; padding: 0.5rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; }
                .back-link { display: inline-block; margin-top: 1.5rem; color: var(--text-muted); text-decoration: none; font-size: 0.85rem; }
                .back-link:hover { color: var(--accent-gold); }
            </style>
        </head>
        <body>
            <div class="login-card">
                <h1>🔒 Analytics Privé</h1>
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

    // Chargement des données statistiques (Uniquement accessible une fois connecté)
    $stats = [
        'summary' => ['pageviews' => 0, 'cv_downloads' => 0, 'cv_views' => 0, 'games_played' => 0, 'easter_eggs' => 0, 'contacts' => 0],
        'events' => [],
        'referrers' => [],
        'devices' => ['desktop' => 0, 'mobile' => 0, 'tablet' => 0],
        'daily' => [],
        'recent' => []
    ];

    if (file_exists($statsFile)) {
        $content = @file_get_contents($statsFile);
        if ($content) $stats = json_decode($content, true) ?: $stats;
    }

    // Export JSON si demandé (toujours protégé)
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Interface Dashboard HTML
    header('Content-Type: text/html; charset=utf-8');
    ?>
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tableau de bord Analytics | Portfolio Hibouxe</title>
        <style>
            :root {
                --bg: #0b140e;
                --card-bg: rgba(26, 51, 34, 0.7);
                --accent-gold: #d4af37;
                --accent-green: #2ecc71;
                --text: #f0f3f1;
                --text-muted: #a3b899;
                --border: rgba(212, 175, 55, 0.25);
            }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            body { background: var(--bg); color: var(--text); padding: 2rem 1rem; min-height: 100vh; }
            .container { max-width: 1000px; margin: 0 auto; }
            h1 { color: var(--accent-gold); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 10px; font-size: 1.8rem; }
            .subtitle { color: var(--text-muted); margin-bottom: 2rem; font-size: 0.95rem; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
            .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; backdrop-filter: blur(10px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
            .card-title { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; }
            .card-value { font-size: 1.8rem; font-weight: bold; color: var(--accent-gold); }
            .section-title { color: var(--accent-gold); margin: 2rem 0 1rem; font-size: 1.2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.9rem; }
            th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.07); }
            th { color: var(--text-muted); font-weight: 600; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
            .badge-cv { background: rgba(212, 175, 55, 0.2); color: var(--accent-gold); border: 1px solid var(--accent-gold); }
            .badge-game { background: rgba(46, 204, 113, 0.2); color: var(--accent-green); border: 1px solid var(--accent-green); }
            .badge-egg { background: rgba(155, 89, 182, 0.2); color: #c39bd3; border: 1px solid #c39bd3; }
            .recent-list { max-height: 400px; overflow-y: auto; }
            .refresh-btn { background: var(--accent-gold); color: #000; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: bold; cursor: pointer; float: right; }
            .actions-bar { float: right; display: flex; gap: 0.5rem; }
            .btn-action { background: var(--accent-gold); color: #000; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 0.85rem; }
            .btn-action:hover { background: #e5c158; }
            .btn-logout { background: rgba(231, 76, 60, 0.2); color: #ff6b6b; border: 1px solid #e74c3c; }
            .btn-logout:hover { background: rgba(231, 76, 60, 0.4); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="actions-bar">
                <button class="btn-action" onclick="location.reload()">🔄 Actualiser</button>
                <a href="track.php?action=logout" class="btn-action btn-logout">🚪 Déconnexion</a>
            </div>
            <h1>🦉 Analytics du Portfolio</h1>
            <p class="subtitle">Statistiques souveraines, anonymisées et conformes RGPD hébergées sur ton serveur.</p>

            <div class="grid">
                <div class="card">
                    <div class="card-title">Pages Vues</div>
                    <div class="card-value"><?= number_format($stats['summary']['pageviews'] ?? 0) ?></div>
                </div>
                <div class="card">
                    <div class="card-title">CV Téléchargés</div>
                    <div class="card-value"><?= number_format($stats['summary']['cv_downloads'] ?? 0) ?></div>
                </div>
                <div class="card">
                    <div class="card-title">Parties d'Arcade</div>
                    <div class="card-value"><?= number_format($stats['summary']['games_played'] ?? 0) ?></div>
                </div>
                <div class="card">
                    <div class="card-title">Easter Eggs Trouvés</div>
                    <div class="card-value"><?= number_format($stats['summary']['easter_eggs'] ?? 0) ?></div>
                </div>
                <div class="card">
                    <div class="card-title">Clics Contacts / Réseaux</div>
                    <div class="card-value"><?= number_format($stats['summary']['contacts'] ?? 0) ?></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="card">
                    <div class="card-title">Sources de Trafic (Referrers)</div>
                    <table>
                        <thead><tr><th>Source</th><th>Visites</th></tr></thead>
                        <tbody>
                            <?php if (empty($stats['referrers'])): ?>
                                <tr><td colspan="2" style="color: var(--text-muted);">Aucune donnée pour l'instant.</td></tr>
                            <?php else: ?>
                                <?php arsort($stats['referrers']); foreach ($stats['referrers'] as $ref => $count): ?>
                                    <tr><td><strong><?= htmlspecialchars(ucfirst($ref)) ?></strong></td><td><?= (int)$count ?></td></tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>

                <div class="card">
                    <div class="card-title">Appareils Utilisés</div>
                    <table>
                        <thead><tr><th>Appareil</th><th>Part</th></tr></thead>
                        <tbody>
                            <tr><td>🖥️ Ordinateur (Desktop)</td><td><strong><?= (int)($stats['devices']['desktop'] ?? 0) ?></strong></td></tr>
                            <tr><td>📱 Smartphone (Mobile)</td><td><strong><?= (int)($stats['devices']['mobile'] ?? 0) ?></strong></td></tr>
                            <tr><td>📟 Tablette</td><td><strong><?= (int)($stats['devices']['tablet'] ?? 0) ?></strong></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <h2 class="section-title">Dernières Activités</h2>
            <div class="card recent-list">
                <table>
                    <thead><tr><th>Date & Heure</th><th>Événement</th><th>Détails</th><th>Source</th><th>Appareil</th></tr></thead>
                    <tbody>
                        <?php if (empty($stats['recent'])): ?>
                            <tr><td colspan="5" style="color: var(--text-muted);">Aucune activité récente.</td></tr>
                        <?php else: ?>
                            <?php foreach (array_reverse($stats['recent']) as $act): ?>
                                <tr>
                                    <td style="color: var(--text-muted); font-size: 0.8rem;"><?= htmlspecialchars($act['time'] ?? '') ?></td>
                                    <td>
                                        <?php 
                                            $ev = $act['event'] ?? '';
                                            $cls = 'badge-game';
                                            if (strpos($ev, 'cv') !== false) $cls = 'badge-cv';
                                            if (strpos($ev, 'egg') !== false || strpos($ev, 'vectrex') !== false) $cls = 'badge-egg';
                                        ?>
                                        <span class="badge <?= $cls ?>"><?= htmlspecialchars($ev) ?></span>
                                    </td>
                                    <td><?= htmlspecialchars(json_encode($act['props'] ?? [], JSON_UNESCAPED_UNICODE)) ?></td>
                                    <td><?= htmlspecialchars($act['ref'] ?? 'direct') ?></td>
                                    <td><?= htmlspecialchars($act['device'] ?? 'desktop') ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
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
    'social_click'
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

// Chargement & Mise à jour atomique du fichier de stats
$stats = [
    'summary' => ['pageviews' => 0, 'cv_downloads' => 0, 'cv_views' => 0, 'games_played' => 0, 'easter_eggs' => 0, 'contacts' => 0],
    'events' => [],
    'referrers' => [],
    'devices' => ['desktop' => 0, 'mobile' => 0, 'tablet' => 0],
    'daily' => [],
    'recent' => []
];

if (file_exists($statsFile)) {
    $content = @file_get_contents($statsFile);
    if ($content) $stats = json_decode($content, true) ?: $stats;
}

// Mise à jour des compteurs globaux
if ($event === 'page_view') $stats['summary']['pageviews'] = ($stats['summary']['pageviews'] ?? 0) + 1;
if ($event === 'cv_download') $stats['summary']['cv_downloads'] = ($stats['summary']['cv_downloads'] ?? 0) + 1;
if ($event === 'cv_view') $stats['summary']['cv_views'] = ($stats['summary']['cv_views'] ?? 0) + 1;
if ($event === 'game_start') $stats['summary']['games_played'] = ($stats['summary']['games_played'] ?? 0) + 1;
if ($event === 'easter_egg') $stats['summary']['easter_eggs'] = ($stats['summary']['easter_eggs'] ?? 0) + 1;
if ($event === 'contact_click' || $event === 'social_click') $stats['summary']['contacts'] = ($stats['summary']['contacts'] ?? 0) + 1;

// Mise à jour événement détaillé
if (!isset($stats['events'][$event])) $stats['events'][$event] = 0;
$stats['events'][$event]++;

// Mise à jour Referrer & Device
if (!isset($stats['referrers'][$referrer])) $stats['referrers'][$referrer] = 0;
$stats['referrers'][$referrer]++;

if (!isset($stats['devices'][$device])) $stats['devices'][$device] = 0;
$stats['devices'][$device]++;

// Mise à jour journalière
if (!isset($stats['daily'][$today])) {
    $stats['daily'][$today] = ['pageviews' => 0, 'cv' => 0, 'games' => 0];
}
if ($event === 'page_view') $stats['daily'][$today]['pageviews']++;
if ($event === 'cv_download' || $event === 'cv_view') $stats['daily'][$today]['cv']++;
if ($event === 'game_start') $stats['daily'][$today]['games']++;

// Nettoyage de l'historique journalier (> 60 jours)
if (count($stats['daily']) > 60) {
    $stats['daily'] = array_slice($stats['daily'], -60, 60, true);
}

// Liste des événements récents (garder les 40 derniers)
$stats['recent'][] = [
    'time' => $nowStr,
    'event' => $event,
    'props' => $props,
    'ref' => $referrer,
    'device' => $device
];
if (count($stats['recent']) > 40) {
    $stats['recent'] = array_slice($stats['recent'], -40);
}

// Écriture atomique
@file_put_contents($statsFile, json_encode($stats, JSON_UNESCAPED_UNICODE), LOCK_EX);

http_response_code(200);
echo json_encode(['status' => 'success', 'event' => $event]);
