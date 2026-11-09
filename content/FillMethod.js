class FillMethod {
    static Register = {};

    static register(name) {
        FillMethod.Register[name] = this;
    }

    static new(name) {
        if(!Object.keys(FillMethod.Register).includes(name))
            return null;

        const Cls = FillMethod.Register[name];
        return new Cls();
    }

    async apply(content, el) {
        throw new Error("Not implemented");
    }
}


class SimpleInputMethod extends FillMethod {
    static { this.register("simpleinput"); }

    async apply(content, el) {
        console.log("SimpleInputMethod: applying", content, el);
        await Actions.input(el, content);
    }
}

class SimpleSelectMethod extends FillMethod {
    static { this.register("simpleselect"); }

    async apply(content, el) {
        console.log("SimpleSelectMethod: applying", content, el);
        await Actions.input(el, content);
    }
}