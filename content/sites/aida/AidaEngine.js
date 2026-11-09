console.debug("PastaTime -- aida.js: loading...");

class AidaContentStore extends ContentStore {

    static AllowedExtensions = [".aida"];

    getName(content) {
        if(content.objectType === "bill") {
            return "Facture";
        } else if(content.objectType === "reception") {
            return "Réception";
        } else {
            return "Inconnu";
        }
    }

    getSummary(content) {
        if(content.objectType === "bill") {
            const nTransactions = content.transactions.length;
            return `${nTransactions} transactions`;
        } else if(content.objectType === "reception") {
            const nLines = content.lines.length;
            return `${nLines} lignes`;
        } else {
            return "Illisible";
        }
    }

}

class AidaEngine extends Engine {

    static ContentStoreClass = AidaContentStore;

    static ObjectTypes = {
        "Factures": "bill",
        "Réceptions": "reception",
        "Livraisons": "shipping",
    };

    constructor() {
        super();

        this.currentObjectType = null;

        this.observer = new MutationObserver(
            this.checkPage.bind(this)
        );

        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        this.on("Ctrl+Alt+A", "add");
        this.on("Ctrl+Alt+S", "save");
        this.on("Ctrl+Alt+C", "close");
    }

    async init() {
        await super.init();

        await this.loadPaths("aida", "general_paths.json")
    }

    get addButton() {
        return this.searchElement("addButton");
    }

    get saveButton() {
        return this.searchElement("saveButton");
    }

    get checkButton() {
        return this.searchElement("checkButton");
    }

    get closeButton() {
        return this.searchElement("closeButton");
    }

    add() {
        Actions.click(this.addButton);
    }

    save() {
        this.check();
        Actions.click(this.saveButton);
    }

    check() {
        Actions.click(this.checkButton);
    }

    close() {
        Actions.click(this.closeButton);
    }

    async checkPage() {
        const breadcrumbs = document.querySelectorAll(".s_breadcrumb_step_link");
        const text = breadcrumbs
            ?.item(breadcrumbs.length - 1)
            ?.ariaLabel;

        const objectType = AidaEngine.ObjectTypes[text] || null;
        if(objectType !== this.currentObjectType) {
            this.currentObjectType = objectType;
            await this.data.filterObjectType(objectType);

            if(objectType === "bill") {
                const role = document.querySelector(".s_profile_bar_textlink_role");
                if(role?.ariaLabel.includes("Epicerie")) {
                    await this.loadPlan("aida", "bill_es_plan.json");
                    await this.loadPaths("aida", "bill_es_paths.json");
                } else if(role?.ariaLabel.includes("CD"))
                    await this.loadPlan("aida", "bill_aa_plan.json");
                    await this.loadPaths("aida", "bill_aa_paths.json");
            } else if(objectType === "reception") {
                await this.loadPlan("aida", "reception_plan.json");
                await this.loadPaths("aida", "reception_paths.json");
            }
        }

        await this.updateInputVisualizer();
    }
}

const engine = new AidaEngine;
engine.init();

console.debug("PastaTime -- aida.js: loaded");