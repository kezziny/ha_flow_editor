exports.id = 'mqttsensor';
exports.title = 'MQTT sensor';
exports.group = 'HA MQTT';
exports.color = '#888600';
exports.version = '1.1.0';
exports.icon = 'sign-in';
exports.output = 1;
exports.variables = true;
exports.author = 'Martin Smola';
exports.options = { conditions: [{ operator: '==', datatype: 'Number', value: 1, index: 0 }], outputs: [{ broker: null, device: "", attribute: "", attributes: [] }] };

exports.html = `
<style>
	.cond-col1 { width:20px; float:left; }
	.cond-col2 { width:300px; float:left; }
	.cond-col3 { width:300px; float:left; }
	.cond-col4 { width:50px; float:left; }
	.cond-col5 { width:30px; float:left; }
	.pr10 { padding-right:10px; }
	.cond-remove { padding: 8px 13px; }
</style>
<div class="padding">
	
	<section>
		<label><i class="fa fa-edit"></i>@(Subscriptions)</label>
		<div class="padding npb">
			<div class="row">
				<div class="col-md-12">
					<div class="cond-col1"><strong>#</strong></div>
					<div class="cond-col2"><strong>Device</strong></div>
					<div class="cond-col3"><strong>Attribute</strong></div>
				</div>
			</div>
			<div data-jc="repeater" data-jc-path="outputs" class="mt10">
				<script type="text/html">
				<div class="row">
					<div class="col-md-12">
						<div class="cond-col1 mt5"><strong>$index</strong></div>
						<div class="cond-col2 pr10">
							<div data-jc="dropdown" data-index="$index" data-jc-path="outputs[$index].device" data-jc-config="datasource:mqttconfig.devices;required:true" class="m"></div>
						</div>
						<div class="cond-col3 pr10">
							<div data-jc="dropdown" data-jc-path="outputs[$index].attribute" data-jc-config="datasource:outputs[$index].attributes;required:true" class="m"></div>
						</div>
						<div class="cond-col4 pr10"></div>
						<div class="cond-col5"><button class="exec button button-small cond-remove" data-exec="FUNC.switchcomponent_remove_condition" data-index="$index"><i class="fa fa-trash"></i></button></div>
					</div>
				</div>
				</script>
			</div>
			<div class="row">
				<div class="col-md-2 m">
					<br>
					<button class="exec button button-small" data-exec="FUNC.switchcomponent_add_condition"><i class="fa fa-plus mr5"></i>ADD</button>
				</div>
			</div>
		</div>
	</section>
</div>
<script>
	var mqttconfig = { brokers: [], devices: [], attributes: [] };
	var devices = {};
	var opt = {};
	var outputs;



	FUNC.mqttsensor_device_changed = function(element) {
		console.log("changed");
	};
	
	function device_changed (element, event, value, path)  {
		var index = element.attr('data-index');
        console.log('VALUE HAS BEEN CHANGED:', index, settings.mqttsensor.outputs[index].device);
		if (settings.mqttsensor.outputs[index].device)
		{
			Object.keys(devices).forEach(id => {
				if (devices[id].name === settings.mqttsensor.outputs[index].device)
				{
					console.log('settings.mqttsensor.outputs[' + index + '].attributes', devices[id]);
					SET('settings.mqttsensor.outputs[' + index + '].attributes', Object.keys(devices[id].attributes));
				}
			});
			
		}
    };

	ON('open.mqttsensor', function(component, options) {
		outputs_count = options.conditions.length || 0;

		opt = options;
		outputs = options.outputs;
		TRIGGER('mqtt.brokers', 'mqttconfig.brokers');
		TRIGGER('mqtt.discovery_devices', 'devices');

		var devicelist = [];
		Object.keys(devices).forEach(id => devicelist.push(devices[id].name));
		SET('mqttconfig.devices', devicelist);
	});
	ON('save.mqttsensor', function(component, options) {
		!component.name && (component.name = options.broker + (options.topic ? ' -> ' + options.topic : ''));
		
		var length = options.conditions.length || 0;
		if (changed && length !== outputs_count) {
			if (flow.version < 511) {
				component.connections = {};
				setState(MESSAGES.apply);
			}
			component.output = length;
		}
	});

	var changed = false;
	var outputs_count;

	function updateAttributes(id)  {
		var index = id;
		if (settings.mqttsensor.outputs[index].device)
		{
			Object.keys(devices).forEach(id => {
				if (devices[id].name === settings.mqttsensor.outputs[index].device)
				{
					console.log('settings.mqttsensor.outputs[' + index + '].attributes', devices[id]);
					SET('settings.mqttsensor.outputs[' + index + '].attributes', Object.keys(devices[id].attributes));
				}
			});

		}
    };

	FUNC.switchcomponent_add_condition = function() {
		var outp = { broker: null, device: "", attribute: "", attributes: [] };
		PUSH('settings.mqttsensor.outputs', outp);
		var id = outputs.length - 1;
		WATCH('settings.mqttsensor.outputs['+ id +'].device', () => updateAttributes(id));
		changed = true;
	};

	FUNC.switchcomponent_remove_condition = function(button) {
		var index = button.attr('data-index');
		var conditions = settings.mqttsensor.conditions;
		conditions = conditions.remove('index', parseInt(index));
		SET('settings.mqttsensor.conditions', conditions);
		changed = true;
	};
</script>`;

exports.readme = `
# MQTT sensor
`;

exports.install = function (instance) {

	var old_topic;
	var ready = false;

	instance.custom.reconfigure = function (o, old_options) {


		ready = false;

		if (!MQTT.broker(instance.options.broker))
			return instance.status('No broker', 'red');

		if (instance.options.broker && instance.options.topic) {

			if (old_topic)
				MQTT.unsubscribe(instance.options.broker, instance.id, old_topic);

			old_topic = instance.arg(instance.options.topic);
			MQTT.subscribe(instance.options.broker, instance.id, old_topic);
			ready = true;
			return;
		}

		instance.status('Not configured', 'red');
	};

	instance.on('options', instance.custom.reconfigure);

	instance.on('close', function () {
		MQTT.unsubscribe(instance.options.broker, instance.id, instance.options.topic);
		OFF('mqtt.brokers.message', instance.custom.message);
		OFF('mqtt.brokers.status', instance.custom.brokerstatus);
	});

	instance.custom.brokerstatus = function (status, brokerid, msg) {
		if (brokerid !== instance.options.broker)
			return;

		switch (status) {
			case 'connecting':
				instance.status('Connecting', '#a6c3ff');
				break;
			case 'connected':
				instance.status('Connected', 'green');
				break;
			case 'disconnected':
				instance.status('Disconnected', 'red');
				break;
			case 'connectionfailed':
				instance.status('Connection failed', 'red');
				break;
			case 'new':
				!ready && instance.custom.reconfigure();
				break;
			case 'removed':
				instance.custom.reconfigure();
				break;
			case 'error':
				instance.status(msg, 'red');
				break;
			case 'reconfigured':
				instance.options.broker = msg;
				instance.reconfig();
				instance.custom.reconfigure();
				break;
		}
	}

	instance.custom.message = function (brokerid, topic, message) {
		if (brokerid !== instance.options.broker)
			return;

		var match = mqttWildcard(topic, old_topic);
		if (match) {
			var flowdata = instance.make({ topic: topic, data: message })
			flowdata.set('mqtt_wildcard', match);

			if (instance.options.field) {
				if (message.hasOwnProperty(instance.options.field)) {
					instance.send2(message[instance.options.field]);
				}
			}
			else {
				instance.send2(flowdata);
			}
		}
	}

	ON('mqtt.brokers.message', instance.custom.message);
	ON('mqtt.brokers.status', instance.custom.brokerstatus);

	instance.custom.reconfigure();
};

// https://github.com/hobbyquaker/mqtt-wildcard
function mqttWildcard(topic, wildcard) {
	if (topic === wildcard) {
		return [];
	} else if (wildcard === '#') {
		return [topic];
	}

	var res = [];

	var t = String(topic).split('/');
	var w = String(wildcard).split('/');

	var i = 0;
	for (var lt = t.length; i < lt; i++) {
		if (w[i] === '+') {
			res.push(t[i]);
		} else if (w[i] === '#') {
			res.push(t.slice(i).join('/'));
			return res;
		} else if (w[i] !== t[i]) {
			return null;
		}
	}

	if (w[i] === '#') {
		i += 1;
	}

	return (i === w.length) ? res : null;
}
