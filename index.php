<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$user     = wp_get_current_user();
$user_id  = get_current_user_id();
$username = $user_id ? ( $user->display_name ?: $user->user_login ) : 'Guest';
$initials = strtoupper( mb_substr( $username, 0, 2 ) );
$rest_nonce = wp_create_nonce( 'wp_rest' );
?>
<div class="prizino-arcade-stage">
    <div class="prizino-arcade">

        <img
            src="https://www.prizino.com/wp-content/uploads/2026/09/prizino-realistic-cabinet-v2-fitted.png"
            class="prizino-arcade-image"
            alt="Prizino arcade cabinet"
        >

        <!-- =====================================================
             TOP STATUS
             ===================================================== -->
        <div class="screen-status">

            <div class="screen-player">
                <span class="screen-avatar" id="pz-avatar"><?php echo esc_html( $initials ); ?></span>

                <span class="screen-player-copy">
                    <em>PLAYER ACCOUNT</em>
                    <strong id="pz-player-name"><?php echo esc_html( $username ); ?></strong>
                    <small>
                        <b id="pz-player-level">Lv 1 · Coming Soon</b>
                        <i id="pz-player-xp">0 / 0</i>
                    </small>
                </span>

                <span class="screen-progress">
                    <small>PROGRESS</small>
                    <i id="pz-progress-bar" style="--progress:0%;"></i>
                    <b id="pz-progress-value">0%</b>
                </span>
            </div>

            <div class="screen-balances">
                <button type="button" class="screen-balance" data-coin="Tz">
                    <i class="coin gold"></i>
                    <b id="pz-bal-tz">—</b>
                </button>
                <button type="button" class="screen-balance" data-coin="Dz">
                    <i class="coin silver"></i>
                    <b id="pz-bal-dz">—</b>
                </button>
                <button type="button" class="screen-balance" data-coin="PR">
                    <i class="coin purple"></i>
                    <b id="pz-bal-pr">—</b>
                </button>
            </div>

        </div>

        <!-- =====================================================
             MAIN ARCADE SCREEN 
             ===================================================== -->
        <div class="machine-screen-area">
            <div class="screen-content" id="pz-screen-content">
                <!-- dashboard injected on load -->
            </div>
        </div>

        <div class="machine-ad-label">
            <span>PRIZINO</span>
            <b>MEMBER REWARDS BANNER</b>
        </div>

        <a class="deck-btn-games"    href="/games"><span>GAMES</span></a>
<a class="deck-btn-prizes"   href="/treasury"><span>PRIZES</span></a>
        <button type="button" class="deck-btn-star-pick"   data-screen="star-pick"><span>★ STAR PICK</span></button>

    </div>
</div>

<script>
window.PZ_CONFIG = {
    api:    <?php echo wp_json_encode( rest_url( 'prizino/v1/' ) ); ?>,
    nonce:  <?php echo wp_json_encode( $rest_nonce ); ?>,
    userId: <?php echo (int) $user_id; ?>
};
</script>

