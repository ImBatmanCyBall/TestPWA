export const createCustomEvent = () => {
    const event = new CustomEvent('characterDied', { detail: { reason: 'example' } });
    document.dispatchEvent(event);
}

document.addEventListener('characterDied', () => {
    $('#eventFeedback').removeClass('hidden').text('Game over! User died');

    setTimeout(() => {
        $('#eventFeedback').addClass('hidden');
    }, 3000);
})