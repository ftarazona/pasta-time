console.debug("PastaTime -- engine.js: loading...");

class Engine {

    static ContentStoreClass = null;

    constructor() {
        this.mapping = new Map();
        this.data = new this.constructor.ContentStoreClass(this);
        this.cursor = new Cursor();

        this.fieldSearch = new FieldSearcher();

        this.on("Ctrl+Alt+N", "nextInput");
        this.on("Ctrl+Alt+P", "prevInput");
    }

    on(shortcut, method) {
        if(this[method] == null) return;

        this.mapping.set(shortcut, method);
    }



    async notifyBackground() {
        console.debug("Engine: notifying background");

        await browser.runtime.sendMessage({
            type: "REGISTER",
            mapping: this.mapping
        });
    }

    async notifySidebar() {
        console.debug("Engine: notifying sidebar");

        await browser.runtime.sendMessage({
            type: "SET_FILES",
            content: this.data.content
        }).catch(_ => console.debug("Engine: Sidebar not available"));
    }

    async updateInputVisualizer() {
        const prevNext = this.cursor.getPrevNext(2)
            .map(step => step != null 
                ? [step[0].name, step[1]]
                : [null, null]
            );

        await browser.runtime.sendMessage({
            type: "SET_VISUALIZER",
            content: prevNext
        }).catch(_ => console.debug("Engine: Sidebar not available"));
    }

    async init() {
        await this.notifyBackground();
        await this.notifySidebar();
        //await this.updateInputVisualizer();

        browser.runtime.onMessage.addListener(
            this.onMessage.bind(this)
        );
    }



    async onExecute({method}) {
        console.debug("Engine: Execute", method);

        if(typeof this[method] === 'function') {
            try {
                await this[method]();
                return { success: true };
            } 
            catch(e) {
                return { 
                    success: false, 
                    error: `No method ${method} in class ${this.constructor.name}`
                };
            }
        }
    }

    onGetFiles() {
        console.debug("Engine: Get files");

        return {
            success: true,
            content: this.data.content
        };
    }

    async onRemove({id}) {
        console.debug("Engine: Remove file id");

        this.data.remove(id);
        await this.updateInputVisualizer();

        return {
            success: true,
            content: this.data.content
        };
    }

    async onToggle({id}) {
        console.debug("Engine: Toggle file id");

        this.data.toggle(id);
        await this.updateInputVisualizer();

        return {
            success: true,
            content: this.data.content
        };
    }

    async onFilesUploaded({files}) {
        console.debug("Engine: Files uploaded");

        await this.data.load(files);
        return {
            success: true,
            content: this.data.content
        };
    }

    async onMessage(message) {
        console.debug("Engine: message received:", message);

        const type = message.type;

        const methodMatches = {
            "EXECUTE_COMMAND":  "Execute",
            "GET_FILES":        "GetFiles",
            "REMOVE_ID":        "Remove",
            "TOGGLE_ID":        "Toggle",
            "FILES_UPLOADED":   "FilesUploaded"
        };

        const methodName = methodMatches[type];
        const response = methodName != null
            ? (await this["on" + methodName](message))
            : ({ success: false, error: `Engine: Unknown message type: ${type}` })
        
        return Promise.resolve(response);
    }



    searchElement(name) {
        return this.fieldSearch.search(name);
    }

    async loadResource(site, file) {
        const url = ["resources", "sites", site, file].join("/");
        const fullURL = browser.runtime.getURL(url);
        const response = await fetch(fullURL);
        if(!response.ok) console.error("Engine: Unable to load", fullURL);

        const content = await response.json();
        return content;
    }

    async loadPlan(site, file) {
        const plan = await this.loadResource(site, file);
        this.cursor.setPlan(plan);
    }

    async loadPaths(site, file) {
        const paths = await this.loadResource(site, file);
        this.fieldSearch.setPaths(paths);
    }

    setContent(content) {
        this.cursor.setContent(content);
    }

    async nextInput() {
        if(this.cursor.isReady) {
            const [planIt, value] = this.cursor.current;

            const el = Object.keys(planIt).includes("elID")
                ? document.querySelector("#"+planIt.elID)
                : this.fieldSearch.search(planIt.name);
            if(el == null) {
                console.error("Engine: No input element found for", planIt.name);
                return;
            }

            const methodName = planIt.method;
            const method = FillMethod.new(methodName);
            if(method == null) {
                console.error("Engine: No fill method", methodName);
                return;
            }

            await Actions.focus(el);
            await method.apply(value, el);
            for(var i = 0; i < (planIt.tabs || 0); i++) {
                await Actions.tab();
            }
            Actions.unfocus(el);
            
            this.cursor.increment();

            await sleep(planIt.delay ?? 0);

            if(planIt.autonext) {
                await sleep(100);
                this.nextInput();
            } else {
                await this.updateInputVisualizer();
            }
        }
    }

    async prevInput() {
        this.cursor.decrement();
        await this.updateInputVisualizer();
    }
}

console.debug("PastaTime -- engine.js: loaded")