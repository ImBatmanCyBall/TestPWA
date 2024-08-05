import { connect, disconnect } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { config } from './config'

export const onConnect = async () => {
    const result = await connect( config, {connector: injected()} )

    if ( result.accounts.length > 0 ) {
        $('#connectButton').addClass('hidden')
        $('#connectedWrapper').removeClass('hidden')
        $('#connectedAccountLabel').removeClass('hidden').text('Connected: ' + result.accounts[0])
    }
}

export const onConnectClicked = onConnect

export const onDisconnectClicked = async () => {
    await disconnect( config )
    $('#connectButton').removeClass('hidden');
    $('#connectedWrapper').addClass('hidden')
    $('#connectedAccountLabel').addClass('hidden').text('-')
}