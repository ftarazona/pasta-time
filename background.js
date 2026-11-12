class BackgroundManager {

    static MAX_N_ACTIONS = 7;

    constructor() {

        this.curTabId = null;

        this.sidebarPort = null;
        this.enginePorts = new Map();

        this.commandMappings = new Map();
    }

    async onMessage(message) {
        const type = message.type;

        if(type === Messaging.IS_READY_FOR_ENGINE) {
            return true;
        }
    }

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


    registerEngine(tabId, mapping) {
        if(mapping.length > BackgroundManager.MAX_N_ACTIONS) {
            console.error("BACKGROUND")
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

    onCommand(name) {
        const method = this.currentMapping?.get(name).method;
        if(method == null) return;

        this.currentEnginePort?.postMessage({
            type: Messaging.EXECUTE_COMMAND,
            method
        });
    }


    async onEngineMessage(message, port) {
        console.debug("Background: Message received from engine", message);
        const type = message.type;

        if(type === Messaging.ENGINE_INFO_UPDATED) {

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

            if(port.sender.tab.active) {
                this.curTabId = tabId;
                await this.setCommands();
            }

        }
    }

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

    onSidebarDisconnected(p) {
        console.log("Background: Sidebar port disconnection", p);
        if(p.error) {
            console.error("Sidebar port disconnected on error", p.error.message);
        }

        this.sidebarPort = null;
    }

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
