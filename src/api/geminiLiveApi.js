/**
 * Gemini Live API Utilities
 * Adapted from user-provided examples
 */

// Response type constants
export const MultimodalLiveResponseType = {
  TEXT: "TEXT",
  AUDIO: "AUDIO",
  SETUP_COMPLETE: "SETUP COMPLETE",
  INTERRUPTED: "INTERRUPTED",
  TURN_COMPLETE: "TURN COMPLETE",
  TOOL_CALL: "TOOL_CALL",
  ERROR: "ERROR",
  INPUT_TRANSCRIPTION: "INPUT_TRANSCRIPTION",
  OUTPUT_TRANSCRIPTION: "OUTPUT_TRANSCRIPTION",
};

/**
 * Parses response messages from the Gemini Live API
 */
export class MultimodalLiveResponseMessage {
  constructor(data) {
    this.data = "";
    this.type = "";
    this.endOfTurn = false;

    this.endOfTurn = data?.serverContent?.turnComplete;

    const parts = data?.serverContent?.modelTurn?.parts;

    try {
      if (data?.setupComplete) {
        this.type = MultimodalLiveResponseType.SETUP_COMPLETE;
      } else if (data?.serverContent?.turnComplete) {
        this.type = MultimodalLiveResponseType.TURN_COMPLETE;
      } else if (data?.serverContent?.interrupted) {
        this.type = MultimodalLiveResponseType.INTERRUPTED;
      } else if (data?.serverContent?.inputTranscription) {
        this.type = MultimodalLiveResponseType.INPUT_TRANSCRIPTION;
        this.data = {
          text: data.serverContent.inputTranscription.text || "",
          finished: data.serverContent.inputTranscription.finished || false,
        };
      } else if (data?.serverContent?.outputTranscription) {
        this.type = MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION;
        this.data = {
          text: data.serverContent.outputTranscription.text || "",
          finished: data.serverContent.outputTranscription.finished || false,
        };
      } else if (data?.toolCall) {
        this.type = MultimodalLiveResponseType.TOOL_CALL;
        this.data = data?.toolCall;
      } else if (parts?.length && parts[0].text) {
        this.data = parts[0].text;
        this.type = MultimodalLiveResponseType.TEXT;
      } else if (parts?.length && parts[0].inlineData) {
        this.data = parts[0].inlineData.data;
        this.type = MultimodalLiveResponseType.AUDIO;
      }
    } catch (e) {
      console.log("⚠️ Error parsing response data: ", data);
    }
  }
}

/**
 * Function call definition for tool use
 */
export class FunctionCallDefinition {
  constructor(name, description, parameters, requiredParameters) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.requiredParameters = requiredParameters;
  }

  functionToCall(parameters) {
    console.log("▶️ Default function call execution");
  }

  getDefinition() {
    const definition = {
      name: this.name,
      description: this.description,
      parameters: { 
        type: "OBJECT",
        properties: this.parameters,
        required: this.requiredParameters 
      },
    };
    return definition;
  }

  runFunction(parameters) {
    console.log(`⚡ Running ${this.name} function with parameters: ${JSON.stringify(parameters)}`);
    this.functionToCall(parameters);
  }
}

/**
 * Main Gemini Live API client
 */
export class GeminiLiveAPI {
  constructor(proxyUrl, projectId, model) {
    this.proxyUrl = proxyUrl;
    this.projectId = projectId;
    this.model = model;
    this.modelUri = `projects/${this.projectId}/locations/us-central1/publishers/google/models/${this.model}`;
    this.responseModalities = ["AUDIO"];
    this.systemInstructions = "";
    this.googleGrounding = false;
    this.enableAffectiveDialog = true; 
    this.voiceName = "Kore"; 
    this.temperature = 1.0; 
    this.proactivity = { proactiveAudio: false }; 
    this.inputAudioTranscription = true;
    this.outputAudioTranscription = true;
    this.enableFunctionCalls = false;
    this.functions = [];
    this.functionsMap = {};
    this.totalBytesSent = 0;

    this.automaticActivityDetection = {
      disabled: false,
      silence_duration_ms: 2000,
      prefix_padding_ms: 500,
      end_of_speech_sensitivity: "END_SENSITIVITY_UNSPECIFIED",
      start_of_speech_sensitivity: "START_SENSITIVITY_UNSPECIFIED",
    };

    this.activityHandling = "ACTIVITY_HANDLING_UNSPECIFIED";
    this.apiHost = "us-central1-aiplatform.googleapis.com";
    this.serviceUrl = `wss://${this.apiHost}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
    this.connected = false;
    this.webSocket = null;

    // Callbacks
    this.onReceiveResponse = (message) => {};
    this.onConnectionStarted = () => {};
    this.onErrorMessage = (message) => { console.error(message); };
    this.onClose = () => {};
  }

  setSystemInstructions(newSystemInstructions) {
    this.systemInstructions = newSystemInstructions;
  }

  connect() {
    this.setupWebSocketToService();
  }

  disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.connected = false;
    }
  }

  sendMessage(message) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  onReceiveMessage(messageEvent) {
    const messageData = JSON.parse(messageEvent.data);
    const message = new MultimodalLiveResponseMessage(messageData);
    this.onReceiveResponse(message);
  }

  setupWebSocketToService() {
    console.log("Connecting to Proxy: ", this.proxyUrl);
    this.webSocket = new WebSocket(this.proxyUrl);

    this.webSocket.onclose = (event) => {
      this.connected = false;
      this.onClose(event);
    };

    this.webSocket.onerror = (event) => {
      this.connected = false;
      this.onErrorMessage("Connection error");
    };

    this.webSocket.onopen = (event) => {
      this.connected = true;
      this.totalBytesSent = 0;
      this.sendInitialSetupMessages();
      this.onConnectionStarted();
    };

    this.webSocket.onmessage = this.onReceiveMessage.bind(this);
  }

  getFunctionDefinitions() {
    const tools = [];
    for (const func of this.functions) {
      tools.push(func.getDefinition());
    }
    return tools;
  }

  sendInitialSetupMessages() {
    // Step 1: Send service URL to tell the proxy where to connect
    const serviceSetupMessage = {
      service_url: this.serviceUrl,
    };
    this.sendMessage(serviceSetupMessage);

    // Step 2: Build and send the session setup message (matching working example format)
    const tools = this.getFunctionDefinitions();

    const sessionSetupMessage = {
      setup: {
        model: this.modelUri,
        generation_config: {
          response_modalities: this.responseModalities,
          temperature: this.temperature,
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.voiceName,
              },
            },
          },
        },
        system_instruction: { parts: [{ text: this.systemInstructions }] },
        tools: { function_declarations: tools },
        proactivity: this.proactivity,
        realtime_input_config: {
          automatic_activity_detection: this.automaticActivityDetection,
          activity_handling: this.activityHandling,
        },
      },
    };

    // Add transcription config if enabled
    if (this.inputAudioTranscription) {
      sessionSetupMessage.setup.input_audio_transcription = {};
    }
    if (this.outputAudioTranscription) {
      sessionSetupMessage.setup.output_audio_transcription = {};
    }

    // Add affective dialog if enabled
    if (this.enableAffectiveDialog) {
      sessionSetupMessage.setup.generation_config.enable_affective_dialog = true;
    }

    console.log('📤 Sending sessionSetupMessage:', JSON.stringify(sessionSetupMessage, null, 2));
    this.sendMessage(sessionSetupMessage);
  }

  sendAudioMessage(base64PCM) {
    const message = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: "audio/pcm",
            data: base64PCM,
          },
        ],
      },
    };
    this.sendMessage(message);
  }
}
