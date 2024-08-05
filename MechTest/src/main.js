import './dollar-bill'
import './events'
import { onConnect, onConnectClicked, onDisconnectClicked } from "./connection.js";
import { createCustomEvent } from "./events.js";

$('#connectButton').on('click', onConnectClicked);
$('#disconnectButton').on('click', onDisconnectClicked);

$('#customEventButton').on('click', createCustomEvent);

// Call onConnect to connect to the wallet as soon as the page loads
onConnect();