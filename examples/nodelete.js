KeyEventer.prototype.get_keyfunction = function(e) {
    var modified, nsmodified;
    modified = this.modified(e);
    nsmodified = this.nsmodified(e);
    if (!modified && e.keyCode === this.keycodes.DOWN) {
        return this.cursor_down;
    }
    if (!modified && e.keyCode === this.keycodes.UP) {
        return this.cursor_up;
    }
    if (!modified && e.keyCode === this.keycodes.ENTER) {
        return this.enter;
    }
    if (modified && e.keyCode === this.keycodes.ENTER) {
        return this.modenter;
    }
    if (modified && e.keyCode === this.keycodes.ENTER) {
        return this.modenter;
    }
    if (modified && e.keyCode === this.keycodes.BACKSPACE) {
        return this.deletenode;
    }
    if (!modified && e.keyCode === this.keycodes.BACKSPACE) {
        return this.deletekey;
    }
    // if (e.keyCode === this.keycodes.DELETE) {
    //     return this.deletenode;
    // }
    if (modified && e.keyCode === this.keycodes.RIGHT) {
        return this.moveright;
    }
    if (modified && e.keyCode === this.keycodes.LEFT) {
        return this.moveleft;
    }
    if (modified && e.keyCode === this.keycodes.UP) {
        return this.moveup;
    }
    if (modified && e.keyCode === this.keycodes.DOWN) {
        return this.movedown;
    }
    if (nsmodified && e.keyCode === this.keycodes.GT) {
        return this.toggle_outline;
    }
    if (nsmodified && e.keyCode === this.keycodes.SLASH) {
        return this.toggle_outline_global;
    }
    if (nsmodified && e.keyCode === this.keycodes.LT) {
        return this.toggle_todo;
    }
    if (nsmodified && e.keyCode === this.keycodes.O_KEY) {
        return this.enterfilter;
    }
    if (nsmodified && e.keyCode === this.keycodes.R_BRACKET) {
        return this.enterisearch;
    }
    if (nsmodified && e.keyCode === this.keycodes.L_BRACKET) {
        return this.enterisearch;
    }
    return null;
};
