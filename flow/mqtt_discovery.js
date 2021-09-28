var id = 'mqttdiscovery';

exports.id = id;
exports.title = 'And';
exports.group = 'Logic';
exports.color = '#656D78';
exports.input = 0;
exports.output = 0;
exports.author = 'Ferenc Klein';
exports.icon = 'code';
exports.version = '1.0.0';
exports.options = {};
exports.error = null;

exports.html = `<div class="padding">
<div class="row">
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-path="topic">@(Discovery topic)</div>
		</div>
	</div>
</div>

<script>
	var ${id}_topic;

	ON('open.${id}', function(component, options) {
		${id}_topic = options.topic = options.topic || 'homeassistant/';
	});

	ON('save.${id}', function(component, options) {
		if (${id}_topic !== options.topic) {
			if (flow.version < 511) {
				component.connections = {};
				setState(MESSAGES.apply);
			}
			component.topic = options.topic || 'homeassistant/';
		}
	});
</script>`;

exports.readme = `# HA MQTT Discovery

...`;

exports.install = function (instance) {

	instance.on('data', function (data) {
		if (inputs[data.index] === data.data) return;

		inputs[data.index] = data.data;

		var new_result = true;
		for (var i = 0; i < inputs.length; ++i) {
			if (!inputs[i]) new_result = false;
		}
		if (result !== undefined && new_result === result) return;

		result = new_result;
		if (result) {
			instance.status('True', 'green');
			instance.send2(0, inputs[0]);
		}
		else {
			instance.status('False', 'red');
			instance.send2(1, null);
		}
	});

	instance.reconfigure = function () {
		try {
			instance.status('...');
			customvar = "hello world";
			FLOW.debug("set var");
			inputs = new Array(instance.options.inputs);
		} catch (e) {
			instance.error('Code: ' + e.message);
		}
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};

FLOW.trigger('logic.custom', function (next) {
	FLOW.debug("trigger called: " + customvar);
	next([customvar]);
});