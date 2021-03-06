(function(){
	var essential = Resolver("essential"),
		pageResolver = Resolver("page"),
		templates = pageResolver("templates"),
		EnhancedDescriptor = essential("EnhancedDescriptor"),
		Layouter = essential("Layouter"),
		Laidout = essential("Laidout"),
		console = essential("console");

	var DocumentRoles = essential("DocumentRoles"), ApplicationConfig = essential("ApplicationConfig");
	var pageState = pageResolver.reference("state");

	/*
		Put your application code here
	*/

	function _CoreFactory() {
		console.log("constructed Core Factory");
	}

	var CoreFactory = Generator(_CoreFactory).restrict({ singleton: true, lifecycle: "page" });
	Resolver(window).set("app.factories.CoreFactory",CoreFactory);

	// role="presentation", enhanced after the initial page is rendered when frontend.js has been loaded.
	var PresentationLoader = Resolver(window).set("app.application.PresentationLoader",Generator(function(){
		console.log("constructed presentation loader");
	}));
	PresentationLoader.restrict({ singleton: true, lifecycle: "page" })

	PresentationLoader.enhance_presentation = function(el,role,config) 
	{
		console.log("enhancing presentation");
	};

	PresentationLoader.layout_presentation = function(el,layout,instance) 
	{
		console.log("layout presentation");
	};
	PresentationLoader.layout_presentation.throttle = 200;

	PresentationLoader.discard_presentation = function(el,role,instance) 
	{
		console.log("discard presentation");
		if (instance) {
			if (instance.onClose) {
				instance.onClose();
			}
		}
		try {
			// IE8 doesn't seem to like this
			el.innerHTML = "";
		} catch(ex) {}
	};

	DocumentRoles.presets.declare("handlers.enhance.presentation", PresentationLoader.enhance_presentation);
	DocumentRoles.presets.declare("handlers.layout.presentation", PresentationLoader.layout_presentation);
	DocumentRoles.presets.declare("handlers.discard.presentation", PresentationLoader.discard_presentation);

	//TODO role that requires permissions

	//TODO role that requires launching

	function frontend_post_loading() {
		// do things here that depends on all scripts and configs being loaded

		console.log("frontend_post_loading");

		// delayed receipt of the authorisation and permissions information.
		setTimeout(function(){
			pageState.set("authorised",true);
		},2000);
	}

	function frontend_launching() {
		//TODO you can enable things here just before app is launched
	}

	// manage the loading of the application
	pageState.on("change",function(ev){
		if (ev.symbol == "loading" && ev.value == false) {
			// finish the loading of the frontend, now that scripts and config is loaded.
			if (pageState("configured")==false) frontend_post_loading();
			pageState.set("configured",true);
		}
		if (ev.symbol == "launching" && ev.value == true) {
			frontend_launching();
			// give app and rendering time to settle
			setTimeout(function(){
				pageState.set("launched",true);
			},100);
		}
	});


function enhance_templated(el,role,config) {
	if (config.template && templates[config.template]) {
		var template = templates[config.template];
		//TODO replace element with template.tagName, mixed attributes and template.html
		el.innerHTML = template.html; //TODO better
		var context = { layouter: this.parentLayouter };
		if (config.layouter) context.layouter = this; //TODO temp fix, move _prep to descriptor
		ApplicationConfig()._prep(el,context); //TODO prepAncestors
		// var descs = branchDescs(el); //TODO manage descriptors as separate branch?
		// DocumentRoles()._enhance_descs(descs);
	}
}

pageResolver.set("handlers.enhance.templated",enhance_templated);


Layouter.variant("multisection",Generator(function(key,el,conf) {
	this.el = el;
	this.sizing = el.stateful("sizing");

},Layouter,{ prototype: {
	"layout": function(el,layout,sizingEls) {

	var centered = [], after = [];
	this.sizing.centerWidth = el.offsetWidth;
	this.sizing.centerHeight = el.offsetHeight;

	var left=0,right=0,top=0,bottom=0;
	for(var i = 0, c; c = sizingEls[i]; ++i) {
		var sizing = c.stateful("sizing");

		// sizing.offset = offset;
		switch(sizing.glue) {
			case "left":
				c.style.left = left+"px";
				left += c.offsetWidth;
				this.sizing.centerWidth -= c.offsetWidth;
				break;
			case "right":
				after.unshift(c);
				break;
			case "top":
				c.style.top = top+"px";
				top += c.offsetHeight;
				this.sizing.centerHeight -= c.offsetHeight;
				break;
			case "bottom":
				after.unshift(c);
				break;
			default:
				centered.push(c);
				break;
		}
	}

	for(var i=0,c; c = after[i]; ++i) {
		var sizing = c.stateful("sizing");
		switch(sizing.glue) {
			case "right":
				c.style.right = right+"px";
				right += c.offsetWidth;
				this.sizing.centerWidth -= c.offsetWidth;
				break;
			case "bottom":
				c.style.bottom = bottom+"px";
				bottom += c.offsetHeight;
				this.sizing.centerHeight -= c.offsetHeight;
				break;
		}			
	}

	// console.log("multisection laid out",this.sizing,left,right);

	for(var i = 0, c; c = centered[i]; ++i) {
		c.style.left = left+"px";
		c.style.right = right+"px";
		c.style.top = top+"px";
		c.style.bottom = bottom+"px";
	}
	},

	childLayouterUpdated : function(layouter,el,layout) {},
	childLaidoutUpdated : function(laidout,el,layout) {
		return true;
	}

}}));

function section_button_click(ev) {
	ev = MutableEvent(ev).withActionInfo();

	if (ev.commandElement) {
		if (ev.stateful && ev.stateful("state.disabled")) return; // disable
		if (ev.ariaDisabled) return; //TODO fold into stateful

		ev.action = "sectioned"
		ev.actionElement = this;//TODO
		fireAction(ev);
		ev.stopPropagation();
	}
	if (ev.defaultPrevented) return false;
}

Laidout.variant("section",Generator(function(key,el,conf,parent) {
	this.el = el;

	this.el.stateful.set("sizing.glue",conf.glue);


	// addEventListeners(el, {
	// 	"click": section_button_click
	// },false);

	// el.stateful.reference("state.expanded").on("change",layouter.updateAccordion.bind(layouter));

	//TODO do this on mainContent
	// this.el.style.visibility = el.stateful("state.expanded")? "visible":"hidden";
	// el.stateful.reference("state.expanded").on("change",this.updateExpanded.bind(this));
},Laidout,{
	"prototype": {
		"updateExpanded": function(ev) {
			//TODO make configurable on laidout/layouter
			// this.el.style.visibility = ev.value? "visible":"hidden";
		}
	}
}));

	function EnhancedTable(el,role,config) {
		this.el = el;
		this.body = el.getElementsByTagName("TBODY")[0];

		this.defaultRowHeight = (this.body.children[0].offsetHeight + this.body.children[1].offsetHeight)/2;
		this.rowHeights = [];

		var desc = EnhancedDescriptor(el.parentNode);
		if (desc && desc.role == "scrolled") {
			if (desc.conf.nativeScrollVert == false) {
				this.scrolled = desc;
				this._bodyHeight(desc);
				this._enableVertScrolling(desc);
			}

		}
	}

	EnhancedTable.prototype._bodyHeight = function(desc) 
	{
		this.nonScrolledHeight = desc.el.scrollHeight - this.body.offsetHeight;
		for(var i=0; i<this.body.children.length; ++i) {
			var rowHeight = this.body.children[i].offsetHeight;
			if (rowHeight || this.rowHeights[i]==undefined) this.rowHeights[i] = rowHeight;
		}
	};

	EnhancedTable.prototype._enableVertScrolling = function(desc)
	{
		desc.stateful.on("change","pos.scrollTop",this,function(ev) {
			// console.log("vert offset",ev.value);
			ev.data._showRows(ev.value,desc.stateful);
		});

		this._showRows(0,desc.stateful);

		desc.instance.vert.trackScrolled(desc.el);
		desc.instance.vert.update(desc.el);

	};

	EnhancedTable.prototype._showRows = function(offset,stateful) 
	{
		var height = this.scrolled.el.offsetHeight - this.nonScrolledHeight,
			contentOffset = this.nonScrolledHeight;

		for(var i=0,c; c = this.body.children[i]; ++i) {
			var rowHeight = this.rowHeights[i];

			// before to show
			if (contentOffset < offset) {
				c.style.display = "none";
			} else if (contentOffset < offset+height) {
				c.style.display = "";

			} else {
				c.style.display = "none";
			}
			contentOffset += rowHeight;
		}

		var scrollHeight = this.nonScrolledHeight + rowHeight * this.body.children.length;
		stateful.set("pos.scrollHeight",scrollHeight);
	};



	function enhance_table(el,role,config)
	{
		return new EnhancedTable(el,role,config);

	}

	function sizing_table(el,sizing,instance)
	{

	}

	function layout_table(el,layout,instance)
	{
		if (instance.scrolled) {
			instance.scrolled.stateful.set("pos.scrollHeight",el.offsetHeight);
			instance._showRows(instance.scrolled.stateful("pos.scrollTop") ,instance.scrolled.stateful);
		}
	}

	function discard_table(el,role,instance)
	{

	}

	DocumentRoles.presets.declare("handlers.enhance.table", enhance_table);
	DocumentRoles.presets.declare("handlers.sizing.table", sizing_table);
	DocumentRoles.presets.declare("handlers.layout.table", layout_table);
	DocumentRoles.presets.declare("handlers.discard.table", discard_table);


	function enhance_adorned(el,role,config) 
	{
		var wrapper = document.createElement("DIV");
		wrapper.className = config.contentClass || config["content-class"] || "content";
		for(var c = el.firstChild; c;) {
			var next = c.nextSibling, adornment,rel;
			if (c.attributes) {adornment = c.getAttribute("data-adornment"); rel = c.getAttribute("rel");}
			if (adornment || rel == "adornment") {
				// adornment
			}
			else wrapper.appendChild(c);
			c = next;
		}
		el.appendChild(wrapper);

		return {
			applyWidth: config.width,
			applyHeight: config.height,
			wrapper:wrapper,
			wrapperPlacement: essential("ElementPlacement")(wrapper)
		};
	}

	function sizing_adorned(el,sizing,instance)
	{
		var width = instance.wrapper.offsetWidth,
			height = instance.wrapper.offsetHeight;
		
		var placement = instance.wrapperPlacement;
		placement.compute();

		if (placement.style.visibility == "hidden") {
			width = 0;
			height = 0;
		}

		width += parseInt(placement.style.marginLeft); //TODO compute
		width += parseInt(placement.style.marginRight); //TODO compute

		sizing.contentWidth = width;
	};

	function layout_adorned(el,layout,instance) 
	{
		el.style.width = layout.contentWidth + "px";

		// el.style.height = height + "px";
	}
	layout_adorned.throttle = 200;

	function discard_adorned(el,role,instance) 
	{
		if (instance) {
			// if (instance.onClose) {
			// 	instance.onClose();
			// }
		}
		try {
			// IE8 doesn't seem to like this
			el.innerHTML = "";
		} catch(ex) {}
	}

	DocumentRoles.presets.declare("handlers.enhance.adorned", enhance_adorned);
	DocumentRoles.presets.declare("handlers.sizing.adorned", sizing_adorned);
	DocumentRoles.presets.declare("handlers.layout.adorned", layout_adorned);
	DocumentRoles.presets.declare("handlers.discard.adorned", discard_adorned);



	console.log("frontend.js finished load execution");

})();
