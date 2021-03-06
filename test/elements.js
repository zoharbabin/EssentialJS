module('Element constructors');

test('Basic element construction',function(){
	var HTMLElement = Resolver("essential::HTMLElement::");
	var callCleaners = Resolver("essential::callCleaners::");

	var div = HTMLElement("div",{ "class":"abc"},"<span>","abc","</span>");
	equal(div.tagName,"DIV");
	equal(div.className,"abc");
	equal(div.innerHTML.toLowerCase(),"<span>abc</span>");

	var span = HTMLElement("span",{ "id":"def"})
	equal(span.id,"def");

	callCleaners(div);
	equal(div._cleaners,undefined);
	callCleaners(null);
	callCleaners();
})

test('Script element construction',function(){
	var HTMLScriptElement = Resolver("essential::HTMLScriptElement::");

	var script = HTMLScriptElement({ "class":"abc"});
	equal(script.tagName,"SCRIPT");
	equal(script.className,"abc");

	var script = HTMLScriptElement({ "src":"abc/script.js"});
	equal(script.tagName,"SCRIPT");
	equal(script.getAttribute("src"),"abc/script.js");
	//equal(script.src,"abc/script.js");

})

test('Enhanced element config',function(){
	ok(true,"TODO configure just using data-role");
	ok(true,"TODO configure just using application/config");
	ok(true,"TODO configure combining a base from application/config and a mixin using data-role");
});

test('EnhancedDescriptor cross browser support',function(){
	ok(true,"TODO uniqueId works across multiple documents");
});

test('addEventListeners catch',function() {
	var HTMLElement = Resolver("essential::HTMLElement::");
	var MutableEvent = Resolver("essential::MutableEvent::");
	var addEventListeners = Resolver("essential::addEventListeners::");
	var removeEventListeners = Resolver("essential::removeEventListeners::");

	var div = HTMLElement("div",{ "class":"abc"},"<span>","abc","</span>");
	var events = {
		"click": sinon.spy(function(ev) {
			
		})
	};
	MutableEvent("click").trigger(div);
	equal(events.click.callCount,0);

	addEventListeners(div,events,false);
	MutableEvent("click").trigger(div);
	equal(events.click.callCount,1);

	removeEventListeners(div,events);
	MutableEvent("click").trigger(div);
	equal(events.click.callCount,1);
});

test('Enhance element early or delayed',function() {
	var DocumentRoles = Resolver("essential::DocumentRoles::");
	var ApplicationConfig = Resolver("essential::ApplicationConfig::");
	var enhancedElements = Resolver("essential::enhancedElements::");
	var appConfig = ApplicationConfig();


	var handlers = {
		"init": {

		},		
		"enhance": {
			"early": sinon.stub(),
			"delayed": sinon.stub(),
			"other": sinon.stub()
		},
		"sizing": {},
		"layout": {
			"early": sinon.stub(),
			"delayed": sinon.stub()
		},
		"discard": {
			"early": sinon.stub(),
			"delayed": sinon.stub()
		}
	};
	handlers.enhance.delayed.returns(false);

	var page = appConfig.page("/test/pages/a2.html",{},[
		'<html><head>', '', '</head><body>',

		'<span role="delayed" id="a"></span>',
		'<span role="early" id="b"></span>',
		'<span role="other" id="c"></span>',

		'</body>'
		].join(""));


	var dr = DocumentRoles(handlers,page);

	var sinonConfig = {}; //TODO config for the sinon elem

	equal(handlers.enhance.early.callCount,1);
	equal(handlers.enhance.delayed.callCount,1);
	equal(handlers.layout.early.callCount,0);
	equal(handlers.discard.early.callCount,0);

	ok(handlers.enhance.early.alwaysCalledWith(page.body.getElementsByTagName("span")[1],"early"))
	//TODO equal(handlers.enhance.early.args[0][2],sinonConfig);

	ok(true,"TODO additional handlers, enhance call after initial round")

	handlers.enhance.additional = sinon.stub();
	handlers.enhance.delayed.returns({});
	dr._enhance_descs(page.resolver("descriptors"));
	equal(handlers.enhance.early.callCount,1,"enhance should be completed already");
	equal(handlers.enhance.delayed.callCount,2);
	equal(handlers.layout.early.callCount,0);
	equal(handlers.discard.early.callCount,0);


	var delayedEl = page.body.getElementsByTagName("span")[0];
	ok(delayedEl);
	var delayedDesc = enhancedElements[delayedEl.uniqueId];
	ok(delayedDesc);
	ok(! delayedDesc.layout.queued);
	delayedEl.stateful.set("state.expanded",true);
	ok(delayedDesc.layout.queued);

	//TODO all with roles are enhanced
	//TODO discard called for all enhanced

	DocumentRoles.info.constructors[-1].discarded(dr); // emulate singleton teardown
	equal(handlers.enhance.early.callCount,1);
	equal(handlers.enhance.delayed.callCount,2);
	equal(handlers.layout.early.callCount,0);
	equal(handlers.discard.early.callCount,1,"early has been discarded");
	equal(handlers.discard.delayed.callCount,1,"delayed has been discarded");
	//TODO make sure that discardHandler for other is blank
});

//TODO layout and discard are optional handlers

function _TestLayouter(key,el,config) {
	this.key = key;
	this.type = config.layouter;
	this.el = el;
	this.config = config;

	this.sizing = {};
}
Resolver("essential::Layouter::").variant("test-group",Generator(_TestLayouter,Resolver("essential::Layouter::"),{
	prototype:{

		sizingElement : sinon.spy(function(parent,child,role,conf) {
			return true;
		}),

		layout: sinon.stub()
		// function(el,layout) {
		// 	debugger;
		// }
	}
}));


test("Enhance layouter element",function() {
	var EnhancedDescriptor = Resolver("essential::EnhancedDescriptor::");
	var sizingElements = Resolver("essential::sizingElements::");
	var enhancedElements = Resolver("essential::enhancedElements::");
	var DocumentRoles = Resolver("essential::DocumentRoles::");
	var ApplicationConfig = Resolver("essential::ApplicationConfig::");
	var appConfig = ApplicationConfig();

	var handlers = {
		"init": {

		},
		"enhance": {
			"early": sinon.stub()
		},
		"sizing": {},
		"layout": {
			"early": sinon.stub()
		},
		"discard": {
			"early": sinon.stub()
		}
	};

	var page = appConfig.page("/test/pages/a3.html",{},[
		'<html><head>', '', '</head><body>',

		'<span role="delayed"></span>',
		'<span data-role="',"'layouter':'test-group'",'"><em>abc</em></span>',

		'</body>'
		].join(""));


	var dr = DocumentRoles(handlers,page);
	equal(typeof page.body.firstChild.nextSibling.layouter,"object");
	var desc = page.resolver("descriptors")[page.body.firstChild.nextSibling.uniqueId];
	// page.body.firstChild.nextSibling.layouter
	ok(desc);
	ok(desc.enhanced || desc.layouter || desc.laidout,"Mark TestLayouter desc enhanced");
	ok(desc.layout.queued);
	
	equal(_TestLayouter.prototype.sizingElement.callCount,1);
	// var emDesc = page.resolver("descriptors")[page.body.firstChild.nextSibling.firstChild.uniqueId];
	var emDesc = enhancedElements[page.body.firstChild.nextSibling.firstChild.uniqueId];
	ok(emDesc);
	equal(sizingElements[emDesc.uniqueId],emDesc);
	equal(emDesc.layouterParent,desc);

	EnhancedDescriptor.refreshAll();
	equal(_TestLayouter.prototype.layout.callCount,1);
	//TODO test no queued layout.queued
	//TODO sizing values
	//TODO sizing object in stateful is the one from EnhancedElement
});


test("Effective Element Role",function() {

	var HTMLElement = Resolver("essential::HTMLElement::"),
		StatefulResolver = Resolver("essential::StatefulResolver::"),
		effectiveRole = Resolver("essential::effectiveRole::");
	var MutableEvent = Resolver("essential::MutableEvent::");

	equal(effectiveRole(HTMLElement("div",{})),"default");
	equal(effectiveRole(HTMLElement("div",{"role":"button"})),"button");
	equal(effectiveRole(HTMLElement("input",{"type":"range"})),"slider");
	equal(effectiveRole(HTMLElement("select",{})),"listbox");

	var div = HTMLElement("div",{ "class":"abc"});
	StatefulResolver(div).set("impl.role","presenter");
	equal(effectiveRole(div),"presenter");

	var div = HTMLElement("div",{ "class":"abc"});
	StatefulResolver(div);
	equal(effectiveRole(div),"default");
	equal(StatefulResolver(div)("impl","undefined"),undefined);

	var button = HTMLElement("button",{"type":"button"});
	var ev = MutableEvent({ target: button }).withActionInfo();
	equal(ev.commandRole,"button");
	equal(ev.commandElement,button);
});

function makeFieldSpy() {
	var fieldSpy = sinon.spy();
	fieldSpy.prototype.destroy = sinon.spy();
	fieldSpy.prototype.discard = sinon.spy();
	return fieldSpy;
}

function makeFieldGenerator(a,b) {
	var g = Generator(a,b);
	g.prototype.__destroy = g.prototype.destroy;
	g.prototype.__discard = g.prototype.discard;
	g.prototype.destroy = function() {
		++g.prototype.destroy.callCount;
		if (this.__destroy) this.__destroy();
	};
	g.prototype.destroy.callCount = 0;
	g.prototype.discard = function() {
		++g.prototype.discard.callCount;
		if (this.__discard) this.__discard();
	};
	g.prototype.discard.callCount = 0;

	function g2(a,b,c) {
	    var instance = g.call(null,a,b,c);
	    instance.destroy = g.prototype.destroy;
	    instance.discard = g.prototype.discard;
	    return instance;
	}
	g2.prototype = g.prototype;
	return g2; 
}

test("Enhancing elements creating stateful fields",function() {

	var enhanceStatefulFields = Resolver("essential::enhanceStatefulFields::");
	var StatefulField = Resolver("essential::StatefulField::");
	var buttonField = StatefulField.variant("*[role=button]");
	var linkField = StatefulField.variant("*[role=link]");
	var createDocument = Resolver("essential::createHTMLDocument::");

	notEqual(buttonField,StatefulField);

	var buttonFieldSpy = sinon.spy();
	var submitFieldSpy = sinon.spy();
	var resetFieldSpy = sinon.spy();
	var linkFieldSpy = sinon.spy();
	var buttonField = StatefulField.variant("*[role=button]",makeFieldGenerator(buttonFieldSpy,buttonField));
	StatefulField.variant("button[type=button]",buttonField);
	var submitField = StatefulField.variant("button[type=submit]",makeFieldGenerator(submitFieldSpy,StatefulField));
	var resetField = StatefulField.variant("button[type=reset]",makeFieldGenerator(resetFieldSpy,StatefulField));
	var linkField = StatefulField.variant("*[role=link]",makeFieldGenerator(linkFieldSpy,linkField));
	var doc = createDocument([],[
		'<span role="navigation">',
		'<a name="x" role="link"></a>',
		'<span name="z" role="link"></span>',

		'<button name="a" role="button"></button>',
		'<button name="b" role="button"></button>',
		'<button name="c" role="button"></button>',
		'<button name="d" type="submit"></button>',
		'<button name="e" type="reset"></button>',
		'<button name="f" type="button"></button>',
		'</span>'
		]);
	//TODO expect calls with each of the elements
	enhanceStatefulFields(doc.body);
	equal(buttonFieldSpy.callCount,4);
	equal(submitFieldSpy.callCount,1);
	equal(resetFieldSpy.callCount,1);
	equal(linkFieldSpy.callCount,2);
	ok(doc.body.firstChild.childNodes[0].stateful);
	ok(doc.body.firstChild.childNodes[1].stateful);
	ok(doc.body.firstChild.childNodes[2].stateful);
	ok(doc.body.firstChild.childNodes[3].stateful);
	ok(doc.body.firstChild.childNodes[4].stateful);
	ok(doc.body.firstChild.childNodes[5].stateful);

	// destroy called for fields
	Resolver("essential")("cleanRecursively")(doc.body);
	equal(linkField.prototype.destroy.callCount,2);
	equal(linkField.prototype.discard.callCount,2);
	equal(buttonField.prototype.destroy.callCount,4);
	equal(buttonField.prototype.discard.callCount,4);
});

test('Enhancing DocumentRoles with builtin handlers',function(){
	var DocumentRoles = Resolver("essential::DocumentRoles::");
	var ApplicationConfig = Resolver("essential::ApplicationConfig::");
	var appConfig = ApplicationConfig();

	var handlers = {
		"enhance": {
			"dialog": sinon.spy(DocumentRoles.enhance_dialog),// ,
			"navigation": sinon.spy(DocumentRoles.enhance_toolbar),// ,
			"spinner": sinon.spy(DocumentRoles.enhance_spinner),// ,
			"application": sinon.spy(DocumentRoles.enhance_application)// 
		},
		"sizing": {},
		"layout": {
			"dialog": sinon.spy(),// DocumentRoles.layout_dialog,
			"navigation": sinon.spy(),// DocumentRoles.layout_toolbar,
			"spinner": sinon.spy(),// DocumentRoles.layout_spinner,
			"application": sinon.spy()// DocumentRoles.layout_application
		},
		"discard": {
			"dialog": sinon.spy(),// DocumentRoles.discard_dialog,
			"navigation": sinon.spy(),// DocumentRoles.discard_toolbar,
			"spinner": sinon.spy(),// DocumentRoles.discard_spinner,
			"application": sinon.spy()// DocumentRoles.discard_application
		}
	};

	var page = appConfig.page("/test/pages/a4.html",{},[
		'<html><head>', '', '</head><body>',

		'<span role="navigation">',
		'<button name="a"></button>',
		'</span>',

		'</body>'
		].join(""));

	var dr = DocumentRoles(handlers,page);
	equal(handlers.enhance.navigation.callCount,1);
	equal(handlers.layout.navigation.callCount,0);
	equal(handlers.discard.navigation.callCount,0);

	dr._enhance_descs(page.resolver("descriptors"));
	equal(handlers.enhance.navigation.callCount,1,"enhance should be completed already");
	equal(handlers.layout.navigation.callCount,0);
	equal(handlers.discard.navigation.callCount,0);


	// Submit buttons turned into ordinary
	var buttons = page.body.getElementsByTagName("BUTTON");
	for(var i=0,button; button=buttons[i]; ++i) {
		equal(button.type,"button");
	}

	//TODO _resize_descs
	//TODO _layout_descs

	//TODO all with roles are enhanced
	//TODO discard called for all enhanced

	DocumentRoles.info.constructors[-1].discarded(dr); // emulate singleton teardown
	// equal(handlers.enhance.sinon.callCount,1);
	// equal(handlers.layout.sinon.callCount,0);
	// equal(handlers.discard.sinon.callCount,1);
});

test('Discarding enhanced',function() {

	var EnhancedDescriptor = Resolver("essential::EnhancedDescriptor::");
	var ApplicationConfig = Resolver("essential::ApplicationConfig::");
	// var force = true;
	// var desc = EnhancedDescriptor(document.body,"application",{},force,ApplicationConfig());
	// desc.enhanced = true;
	// desc.liveCheck();
	// ok(!desc.discarded,"liveCheck on document.body doesn't discard");
	// document.body.stateful = null;
	// desc.discardNow();
	// document.body.stateful = ApplicationConfig().resolver;

	ok(1,"Discard handler called when discarded");

	ok(1,"Maintain will discard unattached elements");

	ok(1,"Maintain all will not discard elements (especially body) being enhanced");
})

test('Template cloneNode',function() {

	var enhance_template = Resolver("page::handlers.enhance.template::","null");
	ok(enhance_template,"enhance_template");
	if (enhance_template == null) {
		debugger;
		Resolver("page::handlers.enhance.template::","null");
	}
	var HTMLElement = Resolver("essential::HTMLElement::","null");
	ok(HTMLElement,"HTMLElement");

	var div = HTMLElement("div",{},"abc<span>def</span>");
	var tplAbc = enhance_template(div,"template",{ id:"abc" });
	ok(tplAbc);

	var tplAbc = Resolver("templates")(["#abc"]); //TODO Resolver("templates")("#abc");
	ok(tplAbc);

	var cloned = tplAbc.content.cloneNode(true);
	// ok(cloned typeof document.DocumentFragment);
	equal(cloned.childNodes[0].data,"abc");
	equal(cloned.childNodes[1].innerHTML,"def");

			//TODO anonymous template tag

	//TODO test querySelector template lookup

})

test('Role navigation action',function(){
	var DialogAction = Resolver("essential::DialogAction::");
	var DocumentRoles = Resolver("essential::DocumentRoles::");
	var ApplicationConfig = Resolver("essential::ApplicationConfig::");
	var appConfig = ApplicationConfig();
	var fireAction = Resolver("essential::fireAction::");

	function ABC_DialogAction() {

	}
	ABC_DialogAction.prototype.button1 = sinon.spy();
	DialogAction.variant("a/b/c",Generator(ABC_DialogAction,DialogAction));

	function DEF_DialogAction() {

	}
	DEF_DialogAction.prototype.button2 = sinon.spy();
	DialogAction.variant("d/e/f",Generator(DEF_DialogAction,DialogAction));

	var handlers = {
		"enhance": {
			"navigation": DocumentRoles.enhance_toolbar
		},
		"sizing": {},
		"layout": {
			"navigation": DocumentRoles.layout_toolbar
		},
		"discard": {
			"navigation": DocumentRoles.discard_toolbar
		}
	};

	var page = appConfig.page("/test/pages/a5.html",{},[
		'<html><head>', '', '</head><body>',

		'<span role="navigation" action="a/b/c">',
		'<button name="button1" role="button"></button>',
		'</span>',
		'<button name="button2" role="button" action="d/e/f"></button>',

		'</body>'
		].join(""));

	var dr = DocumentRoles(handlers,page);
	var dialog = page.body.firstChild;

	//page.body.firstChild.firstChild.click();
	//simulateClick(page.body.firstChild);//.firstChild);
	dialog.submit({ commandElement: dialog.firstChild, actionElement:dialog, action:"a/b/c", commandName:"button1" });
	ok(ABC_DialogAction.prototype.button1.called);
	fireAction({ commandElement: dialog.nextSibling, actionElement:dialog.nextSibling, action: "d/e/f", commandName: "button2" });
	ok(DEF_DialogAction.prototype.button2.called);

	//TODO events that might trigger actions are extended with action info and filtered through
	// permissions and routers

	//TODO assert action(el,ev)
});


test("Language choice",function(){
	var pager = Resolver("page");

	equal(pager("state.lang"),"en");
	pager.set("state.lang","de");
	equal(document.documentElement.lang,"de");
	pager.set("state.lang","fr");
	equal(document.documentElement.lang,"fr");

});

