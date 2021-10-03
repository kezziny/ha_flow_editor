exports.id = 'mqttsensor';
exports.title = 'MQTT sensor';
exports.group = 'HA MQTT';
exports.color = '#888600';
exports.version = '1.1.0';
exports.icon = 'sign-in';
exports.output = 1;
exports.variables = true;
exports.author = 'Martin Smola';
exports.options = {};

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="broker" data-jc-config="datasource:mqttconfig.brokers;required:true" class="m">@(Select a broker)</div>
	<div data-jc="dropdown" data-bind="null__click:device_changed" data-jc-path="device" data-jc-config="datasource:mqttconfig.devices;required:true" class="m">@(Select a device)</div>
	<div data-jc="dropdown" data-jc-path="attribute" data-jc-config="datasource:mqttconfig.attributes;required:true" class="m">@(Select an attribute)</div>
</div>
<script>
	var mqttconfig = { brokers: [], devices: [], attributes: [] };
	var devices = {};
	var opt = {};

	function device_changed (element, event, value, path)  {
        console.log('VALUE HAS BEEN CHANGED:', opt.device);
		if (opt.device)
		{
			Object.keys(devices).forEach(id => {
				if (devices[id].name === opt.device)
				{
					SET('mqttconfig.attributes', Object.keys(devices[id].attributes));
				}
			});
			
		}
    };

	ON('open.mqttsensor', function(component, options) {
		opt = options;
		TRIGGER('mqtt.brokers', 'mqttconfig.brokers');
		TRIGGER('mqtt.discovery_devices', 'devices');
		TRIGGER('mqtt.discovery_devices', 'devices');
		var devicelist = [];
		Object.keys(devices).forEach(id => devicelist.push(devices[id].name));
		SET('mqttconfig.devices', devicelist);
	});
	ON('save.mqttsensor', function(component, options) {
		!component.name && (component.name = options.broker + (options.topic ? ' -> ' + options.topic : ''));
	});
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
