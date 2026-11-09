class ContentStore {

    static AllowedExtensions = [];

    constructor(engine) {
        this.engine = engine;
        this.items = [];
        this.objectType = null;
        this.selectedId = null;
    }

    setSelectedId(id) {
        this.selectedId = id;
        this.engine.setContent(this.selectedContent);
    }

    async filterObjectType(objectType) {
        console.debug("ContentStore: Filter by object type", objectType);

        this.objectType = objectType;
        this.setSelectedId(null);
        await this.engine.notifySidebar();
    }

    get filteredItems() {
        return this.objectType != null
            ? this.items.filter(it => it.objectType === this.objectType)
            : this.items;
    }

    loadContent(content) {
        console.log("Load content", content);
        const type = content.objectType || "item";
        if(type === "list") {
            content.items.forEach(
                it => this.loadContent(it)
            );
        } else if(
            this.objectType == null ||
            this.objectType === type
        ) {
            console.debug("ContentStore: Loading content");
            this.items.push(content);
        }
    }

    getName(content) { return ""; }
    getSummary(content) { return ""; }

    get selectedContent() {
        return this.selectedId != null
            ? this.filteredItems[this.selectedId]
            : null;
    }

    get content() {
        return {
            files: this.filteredItems.map((f, idx) => ({
                id: idx,
                name: this.getName(f),
                summary: this.getSummary(f)
            })),
            selectedId: this.selectedId
        };
    }

    async load(files) {
        console.debug("ContentStore: Loading files", files);
        for(const file of files) {
            const name = file.name;
            const extension = name.slice(name.lastIndexOf("."));
            const extAllowed = this.constructor.AllowedExtensions
                .includes(extension);
            if(!extAllowed) continue;

            const rawContent = await file.text();
            try {
                const content = JSON.parse(rawContent);
                this.loadContent(content);
            } catch(e) { 
                console.error("JSON parsing error:", e)
            }
        }
    }

    remove(id) {
        console.debug("ContentStore: Remove file id", id);

        if(this.selectedId === id) {
            this.setSelectedId(null);
        }

        this.items.splice(id, 1);
    }

    toggle(id) {
        console.debug("ContentStore: Toggle file id", id);
        
        if(this.selectedId === id)
            this.setSelectedId(null);
        else
            this.setSelectedId(id);
    }
}