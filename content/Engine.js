/** Engine.js
 * 
 * Last modification on 10/11/2026 by F. TARAZONA
 *  Refactoring message passing
 * 
 * Base class Engine abstracts several responsabilities of engines:
 *  - message passing between engines and background/sidebar scripts
 *  - calls to ContentStore methods
 *  - triggering commands
 *  - defining behaviour for base commands
 *  - managing the cursor
 */


class Engine {

    static ContentStoreClass = null;
    static SiteName = null;

    constructor() {
        this.mapping        = new Map();
        this.data           = new this.constructor.ContentStoreClass(this);

        this.cursor         = new Cursor(this);
        this.fieldSearcher  = new FieldSearcher();

        this.port = null;

        //prevInput and nextInput allow the user to handle the cursor
        //without entering data
        this.on("Ctrl+Alt+P", "prevInput");
        this.on("Ctrl+Alt+N", "nextInput");

        //enterInput effectively enters data, then increments the cursor
        this.on("Ctrl+Alt+E", "enterInput");
    }



    /*******************/
    /** SETUP METHODS **/
    /*******************/

    /** Sets a new command map entry.
     * 
     * Params:
     *  - shortcut: hotkey that will trigger the call
     *  - method: method name that will be called
     * 
     * If method is not defined by the engine class, the behavior is
     * undefined, will most likely trigger errors in use. */
    on(shortcut, method) {
        this.mapping.set(shortcut, method);
    }

    /** Helper function for reading a resource file. */
    async _loadResource(filename) {
        const site = this.constructor.SiteName;
        const url = ["resources", "sites", site, filename].join("/");
        const fullURL = browser.runtime.getURL(url);

        const response = await fetch(fullURL);
        if(!response.ok) 
            alert("Engine: Unable to load resource", fullURL);

        const content = await response.json();
        return content;
    }

    /** Loads a plan file and feeds it to the plan to the cursor. */
    async loadPlan(filename) {
        const plan = await this._loadResource(filename);
        await this.cursor.setPlan(plan);
    }

    /** Loads a paths file and feeds it to the field searcher. */
    async loadPaths(filename) {
        const paths = await this._loadResource(filename);
        this.fieldSearcher.setPaths(paths);
    }


    
    /*****************************/
    /** MESSAGE SENDING METHODS **/
    /*****************************/

    /** Notifies the sidebar to show the user updated information. */
    notifyInfoUpdated() {
        this.port?.postMessage({
            type: Messaging.ENGINE_INFO_UPDATED,
            info: {
                itemsInfo: this.data.info,
                visualizer: this.cursor.getWindow(2)
            }
        });
    }

    /** Updates item of the cursor and notifies the sidebar. */
    updateItem(item) {
        this.cursor.setItem(item);
    }


    
    /******************************/
    /** MESSAGE HANDLING METHODS **/
    /******************************/

    /** Handles message from sidebar or background and calls the
     * corresponding method in engine. */
    async onMessage(message) {
        console.debug("Engine: Message received from background", message);
        const type = message.type;

        if(type === Messaging.EXECUTE_COMMAND) {

            const { method } = message

            if(!(typeof this[method] === 'function')) {
                alert("Engine: No method", method, "found");
                return;
            }

            try {
                await this[method]();
            } 
            catch(err) {
                alert("Engine: Error while executing method", method, ":", err);
            }

        } else if(type === Messaging.REQUEST_INFO_UPDATE) {

            this.notifyInfoUpdated();

        } else if(type === Messaging.ITEM_REMOVED) {

            const { itemId } = message;
            this.data.remove(itemId);

        } else if(type === Messaging.ITEM_TOGGLED) {

            const { itemId } = message;
            this.data.toggle(itemId);

        } else if(type === Messaging.FILES_UPLOADED) {

            const { files } = message;
            await this.data.loadFiles(files);

        } else if(type === Messaging.REGISTRATION_SUCCESS) {

            console.log("Registered successfully");

        } else if(type === Messaging.REGISTRATION_FAILURE) {

            console.error("Failed to register to background");

        } else {

            console.warn("Engine: Unknown message type", type);

        }
    }

    /** Setup the port with background when it is ready. */
    setupPort() {

        this.port = browser.runtime.connect({ name: "engine-port" });
        this.port.onMessage.addListener(
            this.onMessage.bind(this)
        );

        this.port.postMessage({
            type: Messaging.ENGINE_REGISTRATION_REQUEST,
            mapping: this.mapping
        });
    }

    /** Waits for background to indicate it is ready. */
    waitForBackground(message) {
        const type = message.type;

        if(type === Messaging.BACKGROUND_READY_FOR_ENGINE) {

            this.setupPort();
            this.notifyInfoUpdated();
        }
    }


    /** Handles setup of the engine. During the setup, background and
     * sidebar scripts are notified and the messages are directed to the
     * global message listener. */
    async init() {
        console.debug("Engine: initialization");

        await browser.runtime.sendMessage({
            type: Messaging.IS_READY_FOR_ENGINE
        }).then(_ => {
            this.setupPort();
            this.notifyInfoUpdated();
        }).catch(_ => {
            browser.runtime.onMessage.addListener(
                this.waitForBackground.bind(this)
            );
        });

        console.debug("Engine: initialized");
    }


    
    /******************************/
    /** MESSAGE HANDLING METHODS **/
    /******************************/

    /** Enters value currently pointed by the cursor.
     * 
     * Throws an error if the field input can not be found or if the 
     * method is not registered as a FillMethod. */
    async enterInput() {
        if(!this.cursor.isReady) return;
            
        const [field, value] = this.cursor.current;
        const fieldName = field.name;
        const methodName = field.method;

        //Search for the input element and the method to apply
        let el, method;
        try {
            el = this.fieldSearcher.search(fieldName);
            method = FillMethod.new(methodName);
        } catch(err) {
            console.warn("No element or method found:", err);
        }

        await Actions.focus(el);
        await method.apply(value, el);

        //Enters the tabs required by the plan
        for(var i = 0; i < (field.tabs || 0); i++) {
            await Actions.tab();
        }
        await Actions.unfocus(el);

        await sleep(field.delay ?? 0);

        //The method can be called recursively if required in the plan
        this.cursor.increment(!field.autonext);
        if(field.autonext) {
            await sleep(100);
            await this.enterInput();
        }
    }

    /** Decrements the cursor without entering the value. */
    prevInput() {
        this.cursor.decrement();
    }

    /** Increments the cursor without entering the value. */
    nextInput() {
        this.cursor.increment();
    }
}
