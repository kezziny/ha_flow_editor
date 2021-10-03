var id = 'logicor';

exports.id = id;
exports.title = 'Or';
exports.group = 'Logic';
exports.color = '#656D78';
exports.input = 2;
exports.output = ['green', 'red'];
exports.author = 'Ferenc Klein';
exports.icon = 'code';
exports.version = '1.0.0';
exports.options = {};
exports.error = null;

exports.html = `<div class="padding">
<div class="row">
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-path="inputs" data-jc-config="type:number;validation:value > 1;increment:true;maxlength:3">@(Number of outputs)</div>
			<div class="help m">@(Minimum is 2)</div>
		</div>
	</div>
</div>

<script>
	var ${id}_input_count;

	ON('open.${id}', function(component, options) {
		${id}_input_count = options.inputs = options.inputs || 2;
	});

	ON('save.${id}', function(component, options) {
		if (${id}_input_count !== options.inputs) {
			if (flow.version < 511) {
				component.connections = {};
				setState(MESSAGES.apply);
			}
			component.input = options.inputs || 2;
		}
	});
</script>`;

exports.readme = `# And

If the last message on both input is trueish, returns the value from the first input, otherwise returns null.`;

exports.install = function (instance) {
	var result = undefined;
	var inputs = [undefined, undefined];

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