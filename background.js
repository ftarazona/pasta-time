console.log("background.js: loading...");

const MAX_N_ACTIONS = 5;

async function showCommands() {
    const commands = await browser.commands.getAll();
    console.log(`Background: Existing commands:`, commands);
}

async function resetCommands() {
    console.log("Background: Reset commands");
    
    const commands = await browser.commands.getAll();
    await Promise.all(
        commands.map(
            cmd => browser.commands.reset(cmd.name)
        )
    );
}


class BackgroundCommandContext {

    constructor(tabId, mapping) {
        this.tabId = tabId;

        if(mapping.length > MAX_N_ACTIONS) {
            console.warn(`Background: Exceeded maximum number of actions (${MAX_N_ACTIONS})`);
            mapping = mapping.slice(0, MAX_N_ACTIONS);
        }
        this.cmdMapping = new Map(
            mapping.entries().map(
                ([shortcut, method], idx) =>
                [
                    "action-" + (idx + 1),
                    { shortcut, method }
                ]
            )
        );
    }

    async enter() {
        console.log("Background: Entering context...");

        await resetCommands();
        await Promise.all(
            this.cmdMapping.entries().map(
                ([name, { shortcut }]) => 
                    browser.commands.update({ name, shortcut })
            )
        );

        await showCommands();
    }

    async exit() {
        console.log("Background: Exiting context");
        
        await resetCommands();
    }

    async execute(cmdName) {
        const cmd = this.cmdMapping.get(cmdName);
        const method = cmd.method;

        await browser.tabs.sendMessage(
            this.tabId,
            {
                type: "EXECUTE_COMMAND",
                method
            }
        );
    }
}


class BackgroundContextManager {

    constructor() {
        this.ctxMap = new Map();
        this.curCtx = null;
    }



    switchContext(tabId) {
        console.log("Background: Switch context to", tabId);

        this.curCtx?.exit();

        this.curCtx = this.ctxMap.get(tabId);
        this.curCtx?.enter();
    }

    onSwitchContext(tab) {        
        this.switchContext(tab.tabId);
    }

    onDeleteContext(tab) {
        console.log("Background: Delete context for", tab);

        const ctx = this.ctxMap.get(tab.tabId);
        if(ctx === this.curCtx)
            ctx?.exit();

        this.ctxMap.delete(tab.tabId);
    }

    async onCommand(cmdName) {
        console.log("Background: Sending command", cmdName);

        this.curCtx?.execute(cmdName);
    }

    init() {
        browser.tabs.onActivated.addListener(
            this.onSwitchContext.bind(this)
        );
        browser.tabs.onRemoved.addListener(
            this.onDeleteContext.bind(this)
        );

        browser.runtime.onMessage.addListener(
            this.onMessage.bind(this)
        );

        browser.commands.onCommand.addListener(
            this.onCommand.bind(this)
        );
    }



    onRegisterContext(tab, {mapping}) {
        console.log("Background: Register context", tab, mapping);

        const ctx = new BackgroundCommandContext(tab.id, mapping);
        this.ctxMap.set(tab.id, ctx);

        if(tab.active)
            this.switchContext(tab.id);
    }

    async onMessage(message, sender) {
        console.log("Background: message received:", message, sender);

        const type = message.type;
        const tab = sender.tab;

        const methodMatches = {
            "REGISTER": "RegisterContext",
        };

        const methodName = methodMatches[type];
        const response = methodName != null
            ? (await this["on" + methodName](tab, message))
            : ({ success: false, error: `Background: Unknown message type: ${type}` })
        
        return Promise.resolve(response);
    }
}

const contexts = new BackgroundContextManager;
contexts.init();

console.log("background.js: loaded");