/** background.js 
 * 
 * Last modification on 12/11/2026 by F. TARAZONA
 *  Refactored for port based approach
 * 
 * Class BackgroundManager handles communication between the engines and
 * the sidebar and the commands.
 */


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

        this.commandMappings = new Map();
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
        )
    }



    /*************/
    /** GETTERS **/
    /*************/

    get currentMapping() {
        return this.commandMappings.get(this.curTabId);
    }

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

    async showCommands() {
        const commands = await browser.commands.getAll();
        console.debug(`Background: Existing commands:`, commands);
    }

    async resetCommands() {
        console.debug("Background: Resetting commands");
        const commands = await browser.commands.getAll();
        await Promise.all(
            commands.map(
                cmd => browser.commands.reset(cmd.name)
            )
        );
    }

    async setCommands() {
        await this.resetCommands();

        const mapping = this.currentMapping;
        if(mapping == null) return;

        console.debug("Background: Setting commands", mapping);
        await Promise.all(
            mapping.entries().map(
                ([ name, { shortcut }]) =>
                    browser.commands.update({ name, shortcut })
            )
        );
    }

    onCommand(name) {
        const method = this.currentMapping?.get(name).method;
        if(method == null) return;

        this.currentEnginePort?.postMessage({
            type: Messaging.EXECUTE_COMMAND,
            method
        });
    }



    /***********************/
    /** ENGINES LIFECYCLE **/
    /***********************/

    /** Sets up a new mapping for the tab of the engine.
     * THIS DOES NOT EFFECTIVELY SET BROWSER COMMANDS */
    registerEngine(tabId, mapping) {
        if(mapping.length > BackgroundManager.MAX_N_ACTIONS) {
            return false;
        }

        this.commandMappings.set(
            tabId,
            new Map(
                mapping.entries().map(
                    ([ shortcut, method ], idx) =>
                        [
                            "action-" + (idx + 1),
                            { shortcut, method }
                        ]
                )
            )
        )

        return true;
    }

    deleteEngine(tabId) {
        this.commandMappings.delete(tabId);
    }


    async onEngineMessage(message, port) {
        console.debug("Background: Message received from engine", message);
        const type = message.type;

        if(type === Messaging.ENGINE_INFO_UPDATED) {

            //Communication targeting sidebar, transfer directly
            this.sidebarPort?.postMessage(message);

        } else if(type === Messaging.ENGINE_REGISTRATION_REQUEST) {

            const tabId = port.sender.tab.id;
            const { mapping } = message;

            const success = this.registerEngine(tabId, mapping);
            if(success) {
                this.enginePorts.get(tabId)?.postMessage({
                    type: Messaging.REGISTRATION_SUCCESS
                });
            } else {
                this.enginePorts.get(tabId)?.postMessage({
                    type: Messaging.REGISTRATION_FAILURE
                });
            }

            //Tabs may be existing when launching the extension.
            if(port.sender.tab.active) {
                this.curTabId = tabId;
                await this.setCommands();
            }

        }
    }

    async onEngineDisconnected(p) {
        console.log("Background: Engine port disconnection", p);
        if(p.error) {
            console.error("Engine port disconnected on error", p.error.message);
        }

        const tabId = p.sender.tab.id;
        if(tabId === this.curTabId) 
            await this.resetCommands();

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
        if(this.curTabId !== tab.tabId) {
            await this.setCommands();
        }

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
