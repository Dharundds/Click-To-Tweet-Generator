
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Help.svelte generated by Svelte v3.46.3 */

    const file$4 = "src/components/Help.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let span;
    	let t0;
    	let t1;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			span = element("span");
    			t0 = text(/*tooltip*/ ctx[0]);
    			t1 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(span, "class", "tooltiptext svelte-9unpgi");
    			add_location(span, file$4, 5, 2, 100);
    			attr_dev(button, "class", "tooltip svelte-9unpgi");
    			attr_dev(button, "data-tooltip", /*tooltip*/ ctx[0]);
    			add_location(button, file$4, 4, 0, 50);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			append_dev(span, t0);
    			append_dev(button, t1);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*tooltip*/ 1) set_data_dev(t0, /*tooltip*/ ctx[0]);

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*tooltip*/ 1) {
    				attr_dev(button, "data-tooltip", /*tooltip*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Help', slots, ['default']);
    	let { tooltip = false } = $$props;
    	const writable_props = ['tooltip'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Help> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('tooltip' in $$props) $$invalidate(0, tooltip = $$props.tooltip);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ tooltip });

    	$$self.$inject_state = $$props => {
    		if ('tooltip' in $$props) $$invalidate(0, tooltip = $$props.tooltip);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tooltip, $$scope, slots];
    }

    class Help extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { tooltip: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Help",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get tooltip() {
    		throw new Error("<Help>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tooltip(value) {
    		throw new Error("<Help>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CustomButton.svelte generated by Svelte v3.46.3 */

    const file$3 = "src/components/CustomButton.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*buttonText*/ ctx[0]);
    			attr_dev(button, "class", "svelte-q7426d");
    			add_location(button, file$3, 5, 0, 72);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*onClick*/ ctx[1])) /*onClick*/ ctx[1].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*buttonText*/ 1) set_data_dev(t, /*buttonText*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CustomButton', slots, []);
    	let { buttonText = "" } = $$props;
    	let { onClick } = $$props;
    	const writable_props = ['buttonText', 'onClick'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CustomButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('buttonText' in $$props) $$invalidate(0, buttonText = $$props.buttonText);
    		if ('onClick' in $$props) $$invalidate(1, onClick = $$props.onClick);
    	};

    	$$self.$capture_state = () => ({ buttonText, onClick });

    	$$self.$inject_state = $$props => {
    		if ('buttonText' in $$props) $$invalidate(0, buttonText = $$props.buttonText);
    		if ('onClick' in $$props) $$invalidate(1, onClick = $$props.onClick);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [buttonText, onClick];
    }

    class CustomButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { buttonText: 0, onClick: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CustomButton",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onClick*/ ctx[1] === undefined && !('onClick' in props)) {
    			console.warn("<CustomButton> was created without expected prop 'onClick'");
    		}
    	}

    	get buttonText() {
    		throw new Error("<CustomButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttonText(value) {
    		throw new Error("<CustomButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onClick() {
    		throw new Error("<CustomButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClick(value) {
    		throw new Error("<CustomButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CustomInput.svelte generated by Svelte v3.46.3 */

    const file$2 = "src/components/CustomInput.svelte";

    function create_fragment$2(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[1]);
    			attr_dev(input, "id", /*id*/ ctx[2]);
    			attr_dev(input, "class", "svelte-1stbsnq");
    			add_location(input, file$2, 6, 0, 98);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*placeholder*/ 2) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[1]);
    			}

    			if (dirty & /*id*/ 4) {
    				attr_dev(input, "id", /*id*/ ctx[2]);
    			}

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CustomInput', slots, []);
    	let { placeholder = "" } = $$props;
    	let { value = "" } = $$props;
    	let { id = "" } = $$props;
    	const writable_props = ['placeholder', 'value', 'id'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CustomInput> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({ placeholder, value, id });

    	$$self.$inject_state = $$props => {
    		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, placeholder, id, input_input_handler];
    }

    class CustomInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { placeholder: 1, value: 0, id: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CustomInput",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get placeholder() {
    		throw new Error("<CustomInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<CustomInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<CustomInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<CustomInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<CustomInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<CustomInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function copyToClipboard(id){
        let copyText = document.getElementById(id) || null;
        if (copyText!==null){
            copyText.select();
            copyText.setSelectionRange(0,99999);
            document.execCommand("copy");
            alert("Copied string = "+ copyText.value);
        }else {
            console.log("no text copied");
        }
    }

    function encodeTweet(text,url,hashtags,username){
        let data = {
            baseUrl:'https://twitter.com/intent/tweet?',
            params:{
                "text":text,
                "url":url,
                "hashtags":hashtags,
                "via":username,
            }
        };

        let query = data.baseUrl;
        for (let d in data.params){
            if(data.params[d] !==''){
                query += encodeURIComponent(d) + '=' + encodeURIComponent(data.params[d]) + '&';
            }
        }
        return query.slice(0,-1);
    }

    const strings = {
        contentToolTip: "Type the body of the tweet",
        urlToolTip: "Type the url you wish to share with the tweet",
        hashtagsToolTip: "Type the hashtags as comma separated values",
        usernameToolTip: "Type the username you wish to tag in the tweet",
        placeholders:{
            name: "Enter the username (if any)",
            hashtags: "Enter the hashtags as csv",
            url: "Enter url (if any)",
            content:"Enter your Text"
        }
    };

    /* src/TweetForm.svelte generated by Svelte v3.46.3 */
    const file$1 = "src/TweetForm.svelte";

    // (26:26) <Help tooltip={strings.contentToolTip}>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(26:26) <Help tooltip={strings.contentToolTip}>",
    		ctx
    	});

    	return block;
    }

    // (31:26) <Help tooltip={strings.urlToolTip}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(31:26) <Help tooltip={strings.urlToolTip}>",
    		ctx
    	});

    	return block;
    }

    // (39:26) <Help tooltip={strings.hashtagsToolTip}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(39:26) <Help tooltip={strings.hashtagsToolTip}>",
    		ctx
    	});

    	return block;
    }

    // (48:26) <Help tooltip={strings.usernameToolTip}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(48:26) <Help tooltip={strings.usernameToolTip}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div6;
    	let div0;
    	let span0;
    	let t1;
    	let custominput0;
    	let updating_value;
    	let t2;
    	let span1;
    	let help0;
    	let t3;
    	let div1;
    	let span2;
    	let t5;
    	let custominput1;
    	let updating_value_1;
    	let t6;
    	let span3;
    	let help1;
    	let t7;
    	let div2;
    	let span4;
    	let t9;
    	let custominput2;
    	let updating_value_2;
    	let t10;
    	let span5;
    	let help2;
    	let t11;
    	let div3;
    	let span6;
    	let t13;
    	let custominput3;
    	let updating_value_3;
    	let t14;
    	let span7;
    	let help3;
    	let t15;
    	let div4;
    	let custombutton0;
    	let t16;
    	let custombutton1;
    	let t17;
    	let div5;
    	let custominput4;
    	let t18;
    	let custombutton2;
    	let current;

    	function custominput0_value_binding(value) {
    		/*custominput0_value_binding*/ ctx[6](value);
    	}

    	let custominput0_props = {
    		placeholder: strings.placeholders.content
    	};

    	if (/*text*/ ctx[0] !== void 0) {
    		custominput0_props.value = /*text*/ ctx[0];
    	}

    	custominput0 = new CustomInput({
    			props: custominput0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(custominput0, 'value', custominput0_value_binding));

    	help0 = new Help({
    			props: {
    				tooltip: strings.contentToolTip,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function custominput1_value_binding(value) {
    		/*custominput1_value_binding*/ ctx[7](value);
    	}

    	let custominput1_props = { placeholder: strings.placeholders.url };

    	if (/*url*/ ctx[2] !== void 0) {
    		custominput1_props.value = /*url*/ ctx[2];
    	}

    	custominput1 = new CustomInput({
    			props: custominput1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(custominput1, 'value', custominput1_value_binding));

    	help1 = new Help({
    			props: {
    				tooltip: strings.urlToolTip,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function custominput2_value_binding(value) {
    		/*custominput2_value_binding*/ ctx[8](value);
    	}

    	let custominput2_props = {
    		placeholder: strings.placeholders.hashtags
    	};

    	if (/*hashtags*/ ctx[1] !== void 0) {
    		custominput2_props.value = /*hashtags*/ ctx[1];
    	}

    	custominput2 = new CustomInput({
    			props: custominput2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(custominput2, 'value', custominput2_value_binding));

    	help2 = new Help({
    			props: {
    				tooltip: strings.hashtagsToolTip,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function custominput3_value_binding(value) {
    		/*custominput3_value_binding*/ ctx[9](value);
    	}

    	let custominput3_props = { placeholder: strings.placeholders.name };

    	if (/*username*/ ctx[3] !== void 0) {
    		custominput3_props.value = /*username*/ ctx[3];
    	}

    	custominput3 = new CustomInput({
    			props: custominput3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(custominput3, 'value', custominput3_value_binding));

    	help3 = new Help({
    			props: {
    				tooltip: strings.usernameToolTip,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	custombutton0 = new CustomButton({
    			props: {
    				onClick: /*func*/ ctx[10],
    				buttonText: "Generate"
    			},
    			$$inline: true
    		});

    	custombutton1 = new CustomButton({
    			props: {
    				onClick: /*clearAll*/ ctx[5],
    				buttonText: "Clear all"
    			},
    			$$inline: true
    		});

    	custominput4 = new CustomInput({
    			props: {
    				type: "text",
    				value: /*tweet*/ ctx[4],
    				id: "myTweet"
    			},
    			$$inline: true
    		});

    	custombutton2 = new CustomButton({
    			props: {
    				onClick: /*func_1*/ ctx[11],
    				buttonText: "Copy String"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Content";
    			t1 = space();
    			create_component(custominput0.$$.fragment);
    			t2 = space();
    			span1 = element("span");
    			create_component(help0.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			span2 = element("span");
    			span2.textContent = "URL";
    			t5 = space();
    			create_component(custominput1.$$.fragment);
    			t6 = space();
    			span3 = element("span");
    			create_component(help1.$$.fragment);
    			t7 = space();
    			div2 = element("div");
    			span4 = element("span");
    			span4.textContent = "Hashtags";
    			t9 = space();
    			create_component(custominput2.$$.fragment);
    			t10 = space();
    			span5 = element("span");
    			create_component(help2.$$.fragment);
    			t11 = space();
    			div3 = element("div");
    			span6 = element("span");
    			span6.textContent = "Username";
    			t13 = space();
    			create_component(custominput3.$$.fragment);
    			t14 = space();
    			span7 = element("span");
    			create_component(help3.$$.fragment);
    			t15 = space();
    			div4 = element("div");
    			create_component(custombutton0.$$.fragment);
    			t16 = space();
    			create_component(custombutton1.$$.fragment);
    			t17 = space();
    			div5 = element("div");
    			create_component(custominput4.$$.fragment);
    			t18 = space();
    			create_component(custombutton2.$$.fragment);
    			attr_dev(span0, "class", "form-field col-one svelte-i5nwk9");
    			add_location(span0, file$1, 23, 4, 527);
    			attr_dev(span1, "class", "tooltip svelte-i5nwk9");
    			add_location(span1, file$1, 25, 4, 660);
    			attr_dev(div0, "class", "row svelte-i5nwk9");
    			add_location(div0, file$1, 22, 2, 505);
    			attr_dev(span2, "class", "form-field col-one svelte-i5nwk9");
    			add_location(span2, file$1, 28, 4, 770);
    			attr_dev(span3, "class", "tooltip svelte-i5nwk9");
    			add_location(span3, file$1, 30, 4, 894);
    			attr_dev(div1, "class", "row svelte-i5nwk9");
    			add_location(div1, file$1, 27, 2, 748);
    			attr_dev(span4, "class", "form-field col-one svelte-i5nwk9");
    			add_location(span4, file$1, 33, 4, 1000);
    			attr_dev(span5, "class", "tooltip svelte-i5nwk9");
    			add_location(span5, file$1, 38, 4, 1155);
    			attr_dev(div2, "class", "row svelte-i5nwk9");
    			add_location(div2, file$1, 32, 2, 978);
    			attr_dev(span6, "class", "form-field col-one svelte-i5nwk9");
    			add_location(span6, file$1, 42, 4, 1271);
    			attr_dev(span7, "class", "tooltip svelte-i5nwk9");
    			add_location(span7, file$1, 47, 4, 1422);
    			attr_dev(div3, "class", "row svelte-i5nwk9");
    			add_location(div3, file$1, 41, 2, 1249);
    			attr_dev(div4, "class", "click-container svelte-i5nwk9");
    			add_location(div4, file$1, 50, 2, 1516);
    			attr_dev(div5, "class", "svelte-i5nwk9");
    			add_location(div5, file$1, 57, 2, 1748);
    			attr_dev(div6, "class", "form-container svelte-i5nwk9");
    			add_location(div6, file$1, 21, 0, 474);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			mount_component(custominput0, div0, null);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			mount_component(help0, span1, null);
    			append_dev(div6, t3);
    			append_dev(div6, div1);
    			append_dev(div1, span2);
    			append_dev(div1, t5);
    			mount_component(custominput1, div1, null);
    			append_dev(div1, t6);
    			append_dev(div1, span3);
    			mount_component(help1, span3, null);
    			append_dev(div6, t7);
    			append_dev(div6, div2);
    			append_dev(div2, span4);
    			append_dev(div2, t9);
    			mount_component(custominput2, div2, null);
    			append_dev(div2, t10);
    			append_dev(div2, span5);
    			mount_component(help2, span5, null);
    			append_dev(div6, t11);
    			append_dev(div6, div3);
    			append_dev(div3, span6);
    			append_dev(div3, t13);
    			mount_component(custominput3, div3, null);
    			append_dev(div3, t14);
    			append_dev(div3, span7);
    			mount_component(help3, span7, null);
    			append_dev(div6, t15);
    			append_dev(div6, div4);
    			mount_component(custombutton0, div4, null);
    			append_dev(div4, t16);
    			mount_component(custombutton1, div4, null);
    			append_dev(div6, t17);
    			append_dev(div6, div5);
    			mount_component(custominput4, div5, null);
    			append_dev(div5, t18);
    			mount_component(custombutton2, div5, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const custominput0_changes = {};

    			if (!updating_value && dirty & /*text*/ 1) {
    				updating_value = true;
    				custominput0_changes.value = /*text*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			custominput0.$set(custominput0_changes);
    			const help0_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				help0_changes.$$scope = { dirty, ctx };
    			}

    			help0.$set(help0_changes);
    			const custominput1_changes = {};

    			if (!updating_value_1 && dirty & /*url*/ 4) {
    				updating_value_1 = true;
    				custominput1_changes.value = /*url*/ ctx[2];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			custominput1.$set(custominput1_changes);
    			const help1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				help1_changes.$$scope = { dirty, ctx };
    			}

    			help1.$set(help1_changes);
    			const custominput2_changes = {};

    			if (!updating_value_2 && dirty & /*hashtags*/ 2) {
    				updating_value_2 = true;
    				custominput2_changes.value = /*hashtags*/ ctx[1];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			custominput2.$set(custominput2_changes);
    			const help2_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				help2_changes.$$scope = { dirty, ctx };
    			}

    			help2.$set(help2_changes);
    			const custominput3_changes = {};

    			if (!updating_value_3 && dirty & /*username*/ 8) {
    				updating_value_3 = true;
    				custominput3_changes.value = /*username*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			custominput3.$set(custominput3_changes);
    			const help3_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				help3_changes.$$scope = { dirty, ctx };
    			}

    			help3.$set(help3_changes);
    			const custombutton0_changes = {};
    			if (dirty & /*tweet, text, url, hashtags, username*/ 31) custombutton0_changes.onClick = /*func*/ ctx[10];
    			custombutton0.$set(custombutton0_changes);
    			const custominput4_changes = {};
    			if (dirty & /*tweet*/ 16) custominput4_changes.value = /*tweet*/ ctx[4];
    			custominput4.$set(custominput4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(custominput0.$$.fragment, local);
    			transition_in(help0.$$.fragment, local);
    			transition_in(custominput1.$$.fragment, local);
    			transition_in(help1.$$.fragment, local);
    			transition_in(custominput2.$$.fragment, local);
    			transition_in(help2.$$.fragment, local);
    			transition_in(custominput3.$$.fragment, local);
    			transition_in(help3.$$.fragment, local);
    			transition_in(custombutton0.$$.fragment, local);
    			transition_in(custombutton1.$$.fragment, local);
    			transition_in(custominput4.$$.fragment, local);
    			transition_in(custombutton2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(custominput0.$$.fragment, local);
    			transition_out(help0.$$.fragment, local);
    			transition_out(custominput1.$$.fragment, local);
    			transition_out(help1.$$.fragment, local);
    			transition_out(custominput2.$$.fragment, local);
    			transition_out(help2.$$.fragment, local);
    			transition_out(custominput3.$$.fragment, local);
    			transition_out(help3.$$.fragment, local);
    			transition_out(custombutton0.$$.fragment, local);
    			transition_out(custombutton1.$$.fragment, local);
    			transition_out(custominput4.$$.fragment, local);
    			transition_out(custombutton2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_component(custominput0);
    			destroy_component(help0);
    			destroy_component(custominput1);
    			destroy_component(help1);
    			destroy_component(custominput2);
    			destroy_component(help2);
    			destroy_component(custominput3);
    			destroy_component(help3);
    			destroy_component(custombutton0);
    			destroy_component(custombutton1);
    			destroy_component(custominput4);
    			destroy_component(custombutton2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TweetForm', slots, []);
    	let text = "";
    	let hashtags = "";
    	let url = "";
    	let username = "";
    	let tweet = "";

    	function clearAll() {
    		$$invalidate(0, text = "");
    		$$invalidate(1, hashtags = "");
    		$$invalidate(2, url = "");
    		$$invalidate(3, username = "");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TweetForm> was created with unknown prop '${key}'`);
    	});

    	function custominput0_value_binding(value) {
    		text = value;
    		$$invalidate(0, text);
    	}

    	function custominput1_value_binding(value) {
    		url = value;
    		$$invalidate(2, url);
    	}

    	function custominput2_value_binding(value) {
    		hashtags = value;
    		$$invalidate(1, hashtags);
    	}

    	function custominput3_value_binding(value) {
    		username = value;
    		$$invalidate(3, username);
    	}

    	const func = () => $$invalidate(4, tweet = encodeTweet(text, url, hashtags, username));
    	const func_1 = () => copyToClipboard("myTweet");

    	$$self.$capture_state = () => ({
    		Help,
    		CustomButton,
    		CustomInput,
    		copyToClipboard,
    		encodeTweet,
    		strings,
    		text,
    		hashtags,
    		url,
    		username,
    		tweet,
    		clearAll
    	});

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    		if ('hashtags' in $$props) $$invalidate(1, hashtags = $$props.hashtags);
    		if ('url' in $$props) $$invalidate(2, url = $$props.url);
    		if ('username' in $$props) $$invalidate(3, username = $$props.username);
    		if ('tweet' in $$props) $$invalidate(4, tweet = $$props.tweet);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		text,
    		hashtags,
    		url,
    		username,
    		tweet,
    		clearAll,
    		custominput0_value_binding,
    		custominput1_value_binding,
    		custominput2_value_binding,
    		custominput3_value_binding,
    		func,
    		func_1
    	];
    }

    class TweetForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TweetForm",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.3 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let tweetform;
    	let current;
    	tweetform = new TweetForm({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Click to tweet generator (v1.1)";
    			t1 = space();
    			create_component(tweetform.$$.fragment);
    			attr_dev(div0, "class", "title svelte-bgihjd");
    			add_location(div0, file, 6, 2, 105);
    			attr_dev(div1, "class", "main svelte-bgihjd");
    			add_location(div1, file, 5, 0, 84);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			mount_component(tweetform, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tweetform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tweetform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(tweetform);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ TweetForm });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
