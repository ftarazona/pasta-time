class FieldSearcher {

    constructor() {
        this.paths = {};
    }

    setPaths(paths) {
        Object.entries(paths).forEach(
            ([key, entry]) => this.paths[key] = entry
        );
    }

    search(fieldName) {
        const path = this.paths[fieldName];
        if(path == null)
            throw new Error("FieldSearcher: No path found for field name", fieldName);

        return path.reduce(
            (el, step) => {
                const [query, id] = step;

                const elements = el.querySelectorAll(query)
                if(id >= elements.length)
                    throw new Error("FieldSearcher: no element found for step", query, id);
                
                return [...elements].at(id);
            }, 
            document
        );
    }
}