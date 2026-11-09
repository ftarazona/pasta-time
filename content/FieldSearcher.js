class FieldSearcher {

    constructor() {
        this.paths = {};
    }

    setPaths(paths) {
        Object.entries(paths).forEach(
            ([key, entry]) => this.paths[key] = entry
        );
    }

    search(name) {
        console.debug("FieldSearcher: search", this.paths, name);
        if(this.paths == null) return;

        const path = this.paths[name];
        if(path == null) return;

        return path.reduce(
            (el, step) => {
                console.debug("FieldSearcher: step", el, step);
                const [query, id] = step;
                return [...el.querySelectorAll(query)].at(id)
            }, document
        );
    }
}