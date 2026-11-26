/** background.js 
 * 
 * Last modification on 12/11/2026 by F. TARAZONA
 *  Refactored for port based approach
 * 
 * Class BackgroundManager handles communication between the engines and
 * the sidebar and the commands.
 */

try {
    importScripts("../utils/messaging.js");
} catch(_) {}

class BackgroundManager {

    //Maximum number of actions is synchronized on manifest information
    static MAX_N_ACTIONS = 
        Object.keys(
            browser.runtime.getManifest().commands
        ).length;

    
    constructor() {

        this.curTabId = null;

        this.sidebarPort = null;
        this.enginePorts = new Map();
    }


    /** The only message passing outside of port communication is used
     * to notify engines they may open a new port when background is
     * ready to connect. */
    async onMessage(message) {
        const type = message.type;

        if(type === Messaging.IS_READY_FOR_ENGINE) {
            return true;
        }
    }

    /** Initializes event handlers, current tab, and notifies every tab
     * that background is now ready to register engines. */
    async init() {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true
        });
        this.curTabId = tab.id;

        browser.tabs.onActivated.addListener(
            tab => this.onTabActivated(tab)
        );

        browser.runtime.onMessage.addListener(
            this.onMessage.bind(this)
        );

        browser.runtime.onConnect.addListener(
            p => this.portConnected(p)
        );

        browser.commands.onCommand.addListener(
            name => this.onCommand(name)
        );

        //Notifying existing tabs is necessary because content scripts
        //may be loaded before the background is initialized.
        const tabs = await browser.tabs.query({});
        await Promise.all(
            tabs.map(
                tab =>
                    browser.tabs.sendMessage(tab.id, {
                        type: Messaging.BACKGROUND_READY_FOR_ENGINE
                    })
            )
        ).catch(() => {});

        console.log(typeof browser);
        console.log(browser.commands);
        console.log(browser.commands?.update);
        if (typeof browser != null && browser.commands?.update != null) {
            await browser.commands.update({ name: "previous", shortcut: "Ctrl+Alt+Left" });
            await browser.commands.update({ name: "next", shortcut: "Ctrl+Alt+Right" });
            await browser.commands.update({ name: "enter", shortcut: "Ctrl+Alt+E" });
            await browser.commands.update({ name: "continue", shortcut: "Ctrl+Alt+C" });
            await browser.commands.update({ name: "new", shortcut: "Ctrl+Alt+N" });
            await browser.commands.update({ name: "save", shortcut: "Ctrl+Alt+S" });
            await browser.commands.update({ name: "cancel", shortcut: "Ctrl+Alt+Z" });
        }
    }



    /*************/
    /** GETTERS **/
    /*************/

    get currentEnginePort() {
        return this.enginePorts.get(this.curTabId);
    }

    get hasSidebar() {
        return this.sidebarPort != null;
    }

    get hasEngine() {
        return this.enginePorts.has(this.curTabId);
    }



    /***************************/
    /** BROWSER COMMAND SETUP **/
    /***************************/

    onCommand(name) {
        const method = name;
        if(method == null) return;

        this.currentEnginePort?.postMessage({
            type: Messaging.EXECUTE_COMMAND,
            method
        });
    }



    /***********************/
    /** ENGINES LIFECYCLE **/
    /***********************/


    async onEngineMessage(message, port) {
        console.debug("Background: Message received from engine", message);
        const type = message.type;

        if(type === Messaging.ENGINE_INFO_UPDATED) {

            //Communication targeting sidebar, transfer directly
            this.sidebarPort?.postMessage(message);

        } else if(type === Messaging.ENGINE_REGISTRATION_REQUEST) {

            const tabId = port.sender.tab.id;

            this.enginePorts.get(tabId)?.postMessage({
                type: Messaging.REGISTRATION_SUCCESS
            });

            //Tabs may be existing when launching the extension.
            if(port.sender.tab.active) {
                this.curTabId = tabId;
            }

        }
    }

    async onEngineDisconnected(p) {
        console.log("Background: Engine port disconnection", p);
        if(p.error) {
            console.error("Engine port disconnected on error", p.error.message);
        }

        const tabId = p.sender.tab.id;

        this.enginePorts.delete(tabId);
    }



    /***********************/
    /** SIDEBAR LIFECYCLE **/
    /***********************/

    onSidebarMessage(message) {
        console.debug("Background: Message received from sidebar", message);
        const type = message.type;

        if(
            type === Messaging.ITEM_REMOVED ||
            type === Messaging.ITEM_TOGGLED ||
            type === Messaging.FILES_UPLOADED
        ) {
            this.currentEnginePort?.postMessage(message);
        }
    }

    onSidebarDisconnected(p) {
        console.log("Background: Sidebar port disconnection", p);
        if(p.error) {
            console.error("Sidebar port disconnected on error", p.error.message);
        }

        this.sidebarPort = null;
    }



    /*********************/
    /** HANDLING EVENTS **/
    /*********************/

    portConnected(p) {
        console.debug("Background: port connection", p);
        const name = p.name;

        if(name === "engine-port") {

            p.onMessage.addListener(
                this.onEngineMessage.bind(this)
            );
            p.onDisconnect.addListener(
                this.onEngineDisconnected.bind(this)
            );

            const tabId = p.sender.tab.id;
            this.enginePorts.set(tabId, p);

        } else if(name === "sidebar-port") {

            p.onMessage.addListener(
                this.onSidebarMessage.bind(this)
            );
            p.onDisconnect.addListener(
                this.onSidebarDisconnected.bind(this)
            );

            this.sidebarPort = p;

            this.currentEnginePort?.postMessage({
                type: Messaging.REQUEST_INFO_UPDATE
            })
        }
    }

    /** Switches mapping and updates the requests the engine to provide
     * updated info to sidebar. */
    async onTabActivated(tab) {

        this.curTabId = tab.tabId;

        if(!this.hasEngine) {

            this.sidebarPort?.postMessage({
                type: Messaging.SIDEBAR_NO_ENGINE_AVAILABLE
            });

        } else {

            this.currentEnginePort?.postMessage({
                type: Messaging.REQUEST_INFO_UPDATE
            });

        }
    }
}

const contexts = new BackgroundManager();
contexts.init();
