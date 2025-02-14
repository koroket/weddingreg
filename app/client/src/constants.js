const angular = require('angular');

angular.module('reg')
    .constant('EVENT_INFO', {
        NAME: 'Jen and Mike 2022',
    })
    .constant('DASHBOARD', {
        PENDING: 'Will be approved soon! Please look out for an email for Dinner option menu!',
        INCOMPLETE_TITLE: 'You still need to complete your dining option and/or COVID vaccine verification',
        INCOMPLETE: "If you do not complete dining and COVID vaccine verification by [APP_DEADLINE]), we won't be able to host you!",
        SUBMITTED_TITLE: 'Your changes has been submitted!',
        SUBMITTED: 'Feel free to edit it at any time!',
        CLOSED_AND_INCOMPLETE_TITLE: 'Unfortunately, registration has closed, and the lottery process has begun.',
        CLOSED_AND_INCOMPLETE: 'Because you have not completed your profile in time, you will not be eligible for the lottery process.',
        ADMITTED_AND_CAN_CONFIRM_TITLE: 'You must confirm by [CONFIRM_DEADLINE].',
        ADMITTED_AND_CANNOT_CONFIRM_TITLE: 'Your confirmation deadline of [CONFIRM_DEADLINE] has passed.',
        ADMITTED_AND_CANNOT_CONFIRM: 'Although you were accepted, you did not complete your confirmation in time.\nUnfortunately, this means that you will not be able to attend the event, as we must begin to accept other applicants on the waitlist.\nWe hope to see you again next year!',
        CONFIRMED_NOT_PAST_TITLE: 'You can edit your confirmation information until [CONFIRM_DEADLINE]',
        DECLINED: 'We\'re sorry to hear that you won\'t be able to make it. We hope to catch up with you next time!',
    })
    .constant('TEAM', {
        NO_TEAM_REG_CLOSED: 'Unfortunately, it\'s too late to enter the lottery with a team.\nHowever, you can still form teams on your own before or during the event!',
    });
