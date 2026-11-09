class GaiaListInputMethod extends FillMethod {
    static { this.register("gaialistinput"); }

    async apply(content, el) {
        Actions.input(el, content);
        await sleep(600);

        const item = el.nextSibling.children[0];
        item.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true })
        );
    }
}

class GaiaActivityFillMethod extends FillMethod {
    static { this.register("gaiaactivityfill"); }

    async apply(content, el) {
        const acts = content.split(",");

        for(const act of acts) {
            console.log(act);
            const item = el
                .querySelector(
                    `div[class='tree-node'][data-reactid*='act${act}']`
                ).querySelector(
                    "label[data-focus='input-checkbox']"
                );
            console.log(item);
            item.click();
        }
    }
}