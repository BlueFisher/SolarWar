import * as $ from 'jquery';
import * as Vue from 'vue';
import * as toastr from 'toastr';
import * as HttpProtocols from '../protocols/http_protocols';
import * as GameProtocols from '../protocols/game_protocols';

import StageManager from './stage_manager';

$(document).ready(() => {
	new StageManager();
});
