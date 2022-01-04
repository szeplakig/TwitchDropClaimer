const RETRY_TIMEOUT = 1000;
const CLAIM_TIMEOUT = 1 * 60 * 60 * 1000;

let PERCENT_TIMES = {};
let TIME_TICKS_IN_PERCENT = 0;

function is_inventory_open() {
    return window.location.href.includes("inventory");
}

function is_user_menu_open() {
    return document.querySelector('div[data-test-selector="user-menu-dropdown__main-menu"]');
}


function try_open_menu() {
    const menu_button = document.querySelector('button[data-test-selector="user-menu__toggle"]');
    if (!menu_button) {
        return false;
    }
    menu_button.click();
    return true;
}


function try_press_claim() {
    const claim_button = document.querySelector('button[data-test-selector="DropsCampaignInProgressRewardPresentation-claim-button"]');
    if (!claim_button) {
        return false;
    }
    claim_button.click();
    return true;
}

function try_press_inventory() {
    const inventory_dropdown_button = document.querySelector('a[data-a-target="inventory-dropdown-link"]');
    if (!inventory_dropdown_button) {
        return false;
    }
    inventory_dropdown_button.click();
    return true;
}

function try_return_to_stream() {
    const return_buttons = document.querySelector('.persistent-player').getElementsByTagName("button");
    return_buttons[return_buttons.length - 2].click(); // hail mary
    return true;
}

function get_percent() {
    const paragraphs_for_percent = document.querySelectorAll('a[data-a-target="inventory-dropdown-link"]>div>div>p');
    if (paragraphs_for_percent.length != 2) {
        return undefined;
    }
    return paragraphs_for_percent[1].innerText.split(" ")[0];
}

function geometric_mean(array) {
    let product = 1;
    for (let i = 0; i < array.length; i++)
        product = product * array[i];
    let gm = Math.pow(product, 1 / array.length);
    return gm;
}


function calculate_time_data() {
    const _percents = Object.keys(PERCENT_TIMES);
    const _times = Object.values(PERCENT_TIMES);

    if (_times.length > 2) {
        let last_percent = _percents[_times.length - 1];
        const percents_remaining = 100 - parseInt(last_percent.substring(0, last_percent.length - 1));
        const diffs = [];
        for (let i = Math.max(_times.length - 10, 1); i < _times.length - 1; i++) {
            diffs.push(_times[i + 1] - _times[i]);
        }
        let time_diff_per_percent = (Math.ceil(geometric_mean(diffs) / 6000)) * 6000;
        return ((percents_remaining * time_diff_per_percent) - TIME_TICKS_IN_PERCENT * RETRY_TIMEOUT);
    }
    return undefined;
}


function millis_to_hhmmss(millis) {
    return new Date(millis).toISOString().slice(11, 19);
}


function display_remaining_time() {
    const remaining_millis = calculate_time_data();
    if (remaining_millis !== undefined) {
        const remaining_time_str = millis_to_hhmmss(remaining_millis);
        console.debug("Approx. time remaining until next drop (mins): ", remaining_millis);
        document.title = `[${remaining_time_str}] $ ${document.title.substring(document.title.indexOf("$") + 1)}`
    } else {
        document.title = `${document.title.substring(document.title.indexOf("$") + 1)}`
    }
}

function try_get_drop() {
    const _is_inventory_open = is_inventory_open();
    const _is_user_menu_open = is_user_menu_open();
    const _percents = Object.keys(PERCENT_TIMES);

    if (_percents.length > 1 && _percents.includes('100%')) {
        console.debug("PROBABLY CAN CLAIM NOW");
        if (_is_inventory_open) {
            console.debug("INVENTORY IS OPEN, TRYING TO CLAIM")
            if (try_press_claim()) {
                PERCENT_TIMES = {};
                console.log("CLAIMED");
            } else {
                console.warn("NO CLAIM BUTTON");
            }
        } else {
            console.debug("INVENTORY IS NOT OPEN, TRYING TO OPEN IT");
            if (_is_user_menu_open) {
                console.debug("USER MENU IS OPEN, TRYING TO PRESS INVENTORY BUTTON");
                if (try_press_inventory()) {
                    console.log("PRESSED INVENTORY BUTTON")
                } else {
                    console.warn("NO INVENTORY BUTTON");
                }
            } else {
                console.debug("USER MENU IS NOT OPEN, TRYING TO OPEN IT");
                if (try_open_menu()) {
                    console.log("OPENED USER MENU");
                } else {
                    console.warn("NO USER MENU BUTTON");
                }
            }
        }
    } else {
        console.debug("CANNOT CLAIM YET PROBABLY");
        if (_is_inventory_open) {
            console.debug("INVENTORY IS OPEN, GOING BACK TO STREAM");
            if (try_return_to_stream()) {
                console.log("PRESSED RETURN")
            } else {
                console.warn("NO RETURN BUTTON");
            }
        } else {
            console.debug("CHECKING PROGRESS");
            if (_is_user_menu_open) {
                console.debug("USER MENU IS OPEN, TRYING TO GET PROGRESS PERCENTAGE");
                const progress = get_percent();
                if (progress === undefined) {
                    console.warn("COULD NOT GET PROGRESS")
                } else {
                    console.debug("GOT PROGRESS: ", progress);
                    if (PERCENT_TIMES[progress] === undefined) {
                        console.debug("SAVING PROGRESS STEP");
                        if (_percents.length === 1 && _percents.includes('100%')) {
                            PERCENT_TIMES = {};
                        }
                        PERCENT_TIMES[progress] = Date.now();
                        TIME_TICKS_IN_PERCENT = 0;
                    } else {
                        console.log("WAITING, PROGRESS: ", progress);
                    }
                    TIME_TICKS_IN_PERCENT++;
                }
            } else {
                console.debug("USER MENU IS NOT OPEN, TRYING TO OPEN IT");
                if (try_open_menu()) {
                    console.log("OPENED USER MENU");
                } else {
                    console.warn("NO USER MENU BUTTON");
                }
            }
        }
    }
    display_remaining_time();
}

if (disable_claimer) {
    disable_claimer();
}
window.RETRY_TIMER = null;


function disable_claimer() {
    clearInterval(window.RETRY_TIMER);
    window.RETRY_TIMER = null;
}

function start_claimer() {
    window.RETRY_TIMER = setInterval(try_get_drop, RETRY_TIMEOUT);
    console.log("Timer id: ", window.RETRY_TIMER);
    console.log("Call disable_claimer to stop it;")
}

function restart_claimer() {
    disable_claimer();
    start_claimer();
}

restart_claimer();