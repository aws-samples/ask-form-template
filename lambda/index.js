// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const { DecimalIntentHandler, FormListHandler } = require('ask-form-sdk');

const { forms } = require('./forms');

// Optionally pull persistence table
const {
    DYNAMODB_TABLE_NAME,
} = process.env

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to sample form, to get started say "start form".';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

class NextHandler {
    constructor(formsHandler) {
        this.formsHandler = formsHandler;
    }
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NextIntent'
            && this.formsHandler.isCurrent(handlerInput);
    }
    handle(handlerInput) {
        // Calls the handleNext from ask-form-sdk
        return this.formsHandler.handleNext(handlerInput)
    }
};

class PreviousHandler {
    constructor(formsHandler) {
        this.formsHandler = formsHandler;
    }
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.PreviousIntent'
            && this.formsHandler.isCurrent(handlerInput);
    }
    handle(handlerInput) {
        // Calls the handlePrevious from ask-form-sdk
        return this.formsHandler.handlePrevious(handlerInput)
    }
};

class ReviewHandler {
    constructor(formsHandler) {
        this.formsHandler = formsHandler;
    }
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ReviewFormIntent'
            && this.formsHandler.isCurrent(handlerInput);
    }
    handle(handlerInput) {
        // Calls the handleFormReview from ask-form-sdk
        return this.formsHandler.handleFormReview(handlerInput)
    }
};

class AplHandler {
    constructor(formsHandler) {
        this.formsHandler = formsHandler;
    }
    canHandle(handlerInput) {
        return (handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent'
            && handlerInput.requestEnvelope.request.arguments !== undefined)
            && this.formsHandler.isCurrent(handlerInput);
    }
    handle(handlerInput) {
        // Calls the handleUserEvent from ask-form-sdk
        return this.formsHandler.handleUserEvent(handlerInput);
    }
};

const SaveFormIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SaveFormIntent';
    },
    handle(handlerInput) {
        const currentIntent = (handlerInput.requestEnvelope.request).intent;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let { completeForm, slotValues } = sessionAttributes;

        if (currentIntent.confirmationStatus == 'DENIED') {
            const speakOutput = 'Okay, Bye.'
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        } else {
            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

            const count = slotValues && Object.keys(slotValues).length
            const speakOutput = completeForm ? `You completed the form` : `You updated ${count} fields in the form`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'To get started say "start form".'
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        // Persist session on stop
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Persist session on end
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ApiUserHandler = {
    async getUser(handlerInput) {
        const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        if (handlerInput.serviceClientFactory) {
            const upsServiceClient = handlerInput.serviceClientFactory.getUpsServiceClient();
            return {
                username: await upsServiceClient.getProfileName(),
                timeZone: await upsServiceClient.getSystemTimeZone(deviceId),
            };
        }
    },
    canHandle() {
        return true;
    }
};

const formsHandler = new FormListHandler(forms, ApiUserHandler);

const requestHandlers = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        new DecimalIntentHandler(formsHandler),
        formsHandler,
        new NextHandler(formsHandler),
        new PreviousHandler(formsHandler),
        new ReviewHandler(formsHandler),
        new AplHandler(formsHandler),
        SaveFormIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    ).addErrorHandlers(
        ErrorHandler,
    );

// Add dynamo db persistence if required
if (DYNAMODB_TABLE_NAME) {
    const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
        tableName: DYNAMODB_TABLE_NAME,
        partitionKeyName: "id",
        createTable: true,
    })
    const PersistenceSavingResponseInterceptor = {
        async process(handlerInput) {
            await handlerInput.attributesManager.savePersistentAttributes();
        }
    };
    // Add persistence adapter and response interceptor
    requestHandlers
        .withPersistenceAdapter(dynamoDbPersistenceAdapter)
        .addResponseInterceptors(PersistenceSavingResponseInterceptor);
}

// const apiClient = new Alexa.DefaultApiClient();
// requestHandlers.withApiClient(apiClient) // add client if your skill is configured for access

exports.handler = requestHandlers.lambda();
