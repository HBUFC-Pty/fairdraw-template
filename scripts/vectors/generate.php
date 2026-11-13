<?php
/**
 * Generates tests/vectors/fairdraw-php-vectors.json by running FairDraw's reference PHP draw code.
 *
 * The reference files are not stored in this repository (they are published by FairDraw under their own licence).
 * Download them first:
 *   curl -o /tmp/fairdraw-draw.php https://fairdraw.partyofone.quest/guides/code/fairdraw-draw.php
 *   curl -o /tmp/fairdraw-entry-codes.php https://fairdraw.partyofone.quest/guides/code/fairdraw-entry-codes.php
 * Then run:
 *   php scripts/vectors/generate.php /tmp > tests/vectors/fairdraw-php-vectors.json
 *
 * The TypeScript port in src/lib/fairdraw/ must reproduce every value in the output exactly.
 */
$dir = $argv[1] ?? null;
if (!$dir || !is_file("$dir/fairdraw-draw.php") || !is_file("$dir/fairdraw-entry-codes.php")) {
    fwrite(STDERR, "usage: php generate.php <directory holding fairdraw-draw.php and fairdraw-entry-codes.php>\n");
    exit(1);
}
require "$dir/fairdraw-draw.php";
require "$dir/fairdraw-entry-codes.php";

mt_srand(20261113);
$rand_hex = function (): string {
    $s = '';
    for ($i = 0; $i < 8; $i++) { $s .= sprintf('%08x', mt_rand(0, 0x7fffffff) ^ (mt_rand(0, 1) << 31)); }
    return $s;
};

$out = ['generated_by' => 'scripts/vectors/generate.php', 'php_version' => PHP_VERSION];

// Normalising and hashing ticket lists, including duplicates, unsorted input and the empty list.
$lists = [[], [1], [3, 17, 240], [240, 3, 17, 3, 17], [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], range(1, 1000), [5000000, 1, 999999]];
for ($i = 0; $i < 20; $i++) {
    $n = mt_rand(1, 300);
    $l = [];
    for ($j = 0; $j < $n; $j++) { $l[] = mt_rand(1, 20000); }
    $lists[] = $l;
}
$out['hashes'] = array_map(fn($l) => ['input' => $l, 'normalised' => fairdraw_normalise($l), 'entries_hash' => fairdraw_entries_hash($l)], $lists);

// The committed beacon round for a close time and wait.
$out['rounds'] = [];
foreach ([1692803367, 1692803400, 1794400000, 1794400001, 1794400002, 1794400003, 1800000000, 1893456000] as $close) {
    foreach ([30, 31, 60, 3600, 86400] as $wait) {
        $out['rounds'][] = ['close_unix' => $close, 'wait' => $wait, 'round' => fairdraw_round_after($close, $wait)];
    }
}

// Commitments.
$out['commits'] = [];
foreach ([[range(1, 250), 1794400000, 300], [[9, 3, 3, 7], 1794400123, 10], [[], 1794400500, 100], [range(2, 5000, 7), 1800000000, 5000]] as [$t, $close, $max]) {
    $out['commits'][] = ['tickets' => $t, 'close_unix' => $close, 'max_tickets' => $max, 'commit' => fairdraw_commit($t, $close, $max)];
}

// Picks: random lists, random randomness, one or several winners, including asking for more winners than tickets.
$out['picks'] = [];
for ($i = 0; $i < 300; $i++) {
    $n = mt_rand(1, 400);
    $t = [];
    for ($j = 0; $j < $n; $j++) { $t[] = mt_rand(1, 5000); }
    $w = [1, 1, 1, 2, 3, 5, 10][mt_rand(0, 6)];
    if ($i % 50 === 0) { $w = count(array_unique($t)) + 2; }
    $r = $rand_hex();
    $out['picks'][] = ['tickets' => $t, 'randomness' => $r, 'winners' => $w, 'won' => fairdraw_pick($t, $r, $w)];
}

// The rejection-sampling arithmetic for pool sizes where rejection is likely (not reachable with real ticket lists).
$out['limits'] = [];
foreach ([1, 2, 3, 7, 1000, 65537, 3000000000, 2147483649, 4294967295, 4294967296] as $n) {
    $out['limits'][] = ['n' => $n, 'limit' => intdiv(4294967296, $n) * $n];
}
// The 32-bit value drawn for a given key and message.
$out['hmac_u32'] = [];
for ($i = 0; $i < 20; $i++) {
    $key = $rand_hex();
    $msg = fairdraw_entries_hash([$i, $i + 1]) . ':' . $i;
    $out['hmac_u32'][] = ['key' => $key, 'message' => $msg, 'value' => unpack('N', substr(hash_hmac('sha256', $msg, hex2bin($key), true), 0, 4))[1]];
}

// Full records, as the PHP code would publish them.
$out['records'] = [];
foreach ([[range(1, 250), 1794400000, 300, 3], [[12, 44, 3, 1000], 1794400777, 1000, 1]] as [$t, $close, $max, $w]) {
    $c = fairdraw_commit($t, $close, $max);
    $r = $rand_hex();
    $rec = fairdraw_record($c, $r, fairdraw_pick($t, $r, $w));
    $out['records'][] = ['tickets' => $t, 'close_unix' => $close, 'max_tickets' => $max, 'winners' => $w,
                         'record' => $rec, 'json' => json_encode($rec), 'json_unescaped' => json_encode($rec, JSON_UNESCAPED_SLASHES)];
}

// Entry codes and the public entry list.
$out['entry_codes'] = [];
foreach ([['s1', 'c1', 7, '1001'], ['s1', 'c1', 8, '1001'], ['s1', 'c1', 7, '1002'], ['s2', 'c1', 7, '1001'],
          ['a-long-secret-value', 'comp-uuid-1234', 99999, 'order-abc']] as [$s, $c, $t, $o]) {
    $out['entry_codes'][] = ['secret' => $s, 'competition_id' => $c, 'ticket' => $t, 'order_id' => $o, 'code' => fairdraw_entry_code($s, $c, $t, $o)];
}
$out['entry_list'] = ['secret' => 's', 'competition_id' => 'c', 'sold' => [[12, 'a'], [3, 'b']],
                      'rows' => fairdraw_public_entry_list('s', 'c', [[12, 'a'], [3, 'b']])];

echo json_encode($out, JSON_UNESCAPED_SLASHES), "\n";
