async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class Actions {

    static async input(el, value) {
        if(el.tagName === "INPUT" || el.tagName === "SELECT") {
            el.value = value;
            el.dispatchEvent(
                new Event(
                    "input", { bubbles: true }
                )
            );
            el.dispatchEvent(
                new Event(
                    "change", { bubbles: true }
                )
            );
        }
        await sleep(50);
    }

    static async tab(el=null) {
        if(el == null) el = document.activeElement;
        el.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: 'Tab',
                    code: 'Tab',
                    keyCode: 9,
                    which: 9,
                    bubbles: true,
                    cancelable: true
                }
            )
        );
        await sleep(50);
    }

    static async click(el) {
        el.dispatchEvent(
            new Event(
                "click", { bubbles: true}
            )
        );
        await sleep(50);
    }

    static async focus(el) {
        el.focus();
        await sleep(50);
    }

    static async select(el) {
        el.focus();
        el.select();
        await sleep(50);
    }

    static unfocus(el) {
        el.focus();
        el.blur();
    }
}