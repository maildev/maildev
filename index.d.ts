  /**
   * Interface for {@link MailDev} options.
   */
  interface MailDevOptions {
    /**
     * IP Address to bind SMTP service to', '0.0.0.0'
     */
    ip?: string | undefined;
  
    /**
     * SMTP host for outgoing emails
     */
    outgoingHost?: string | undefined;
  
    /**
     * SMTP password for outgoing emails
     */
    outgoingPass?: string | undefined;
  
    /**
     * SMTP port for outgoing emails.
     */
    outgoingPort?: number | undefined;
  
    /**
     * SMTP user for outgoing emails
     */
    outgoingUser?: string | undefined;
  
    /**
     * Use SMTP SSL for outgoing emails
     */
    outgoingSecure?: boolean | undefined;
  
    /**
     * SMTP port to catch emails.
     */
    smtp?: number | undefined;
  
    /**
     * Port to use for web UI
     */
    web?: number | undefined;
  
    /**
     * IP Address to bind HTTP service to
     */
    webIp?: string | undefined;
  
    /**
     * Do not start web UI
     */
    disableWeb?: boolean | undefined;
  
    /**
     * Do not output console.log messages
     */
    silent?: boolean | undefined;
  
    /**
     * HTTP user for GUI
     */
    webUser?: string | undefined;
  
    /**
     * HTTP password for GUI
     */
    webPass?: string | undefined;
  
    /**
     */
    verbose?: boolean | undefined;
  
    /**
     * Directory for persisting mails
     */
    mailDirectory?: string | undefined;
  
    /**
     * SMTP user for incoming emails
     */
    incomingUser?: string | undefined;
  
    /**
     * SMTP password for incoming emails
     */
    incomingPass?: string | undefined;
  
    /**
     * Array of SMTP extensions to NOT advertise (SMTPUTF8, PIPELINING, 8BITMIME)
     */
    hideExtensions?: string[] | undefined;
  
    /**
     * Relay email address
     */
    autoRelay?: string | undefined;
  
    /**
     * Filter rules for auto relay mode
     */
    autoRelayRules?: string | string[] | undefined;
  
    /**
     * Base path for URLs
     */
    basePathname?: string | undefined;
  
    /**
     * Switch from http to https protocol
     */
    https?: boolean | undefined;
  
    /**
     * The file path to the ssl cert file
     */
    httpsCert?: string | undefined;
  
    /**
     * The file path to the ssl private key
     */
    httpsKey?: string | undefined;
  
    /**
     * Log mail contents
     */
    logMailContents?: boolean | undefined;
  }
  
  /**
   * Interface for mail.
   */
  interface Mail {
    /**
     * Identifier.
     */
    id?: string | undefined;
  
    time?: Date | undefined;
  
    read?: boolean | undefined;
  
    /**
     * Client.
     */
    envelope?: {
      from: string,
      to: string,
      host: string,
      remoteAddress: string
    } | undefined;
  
    size?: number | undefined;
  
    sizeHuman?: string | undefined;
  
    attachments?: string | undefined;
  
    calculatedBcc?: {
      address: string,
      name: string
    }[] | undefined;
  
    /**
     * HTML Content.
     */
    html?: string | undefined;
  }
  
  declare module "maildev" {
    import fs = require("fs");
  
    /**
     * Interface for {@link MailDev}.
     */
    class MailDev {
      /**
       * Constructor.
       *
       * @param options The options.
       */
      constructor(options: MailDevOptions);
  
      /**
       * Deletes a given email by identifier.
       *
       * @param  id        The email identifier.
       * @param  callback  The error callback.
       */
      deleteEmail(id: string, callback?: (error: Error) => void): void;
  
      /**
       * Deletes all email and their attachments.
       *
       * @param callback The error callback.
       */
      deleteAllEmail(callback?: (error: Error) => void): void;
  
      /**
       * Stops the SMTP server.
       *
       * @param callback The error callback.
       */
      close(callback?: (error: Error) => void): void;
  
      /**
       * Accepts e-mail identifier, returns email object.
       *
       * @param  id        The e-mail identifier.
       * @param  callback  The callback.
       */
      getEmail(id: string, callback?: (error: Error|null, email?: Mail) => void): void;
  
      /**
       * Returns the content type and a readable stream of the file.
       *
       * @param  id        The e-mail identifier.
       * @param  filename  The filename attachment
       * @param  callback  The callback.
       */
      getEmailAttachment(id: string, callback?: (error: Error) => void): void;
  
      /**
       * Returns the html of a given email.
       *
       * @param  id        The e-mail identifier.
       * @param  baseUrl        The e-mail identifier.
       * @param  callback  The callback.
       */
      getEmailHTML(id: string, baseUrl?: string, callback?: (error: Error) => void): void;
  
      /**
       * Download a given email.
       *
       * @param  id        The e-mail identifier.
       * @param  callback  The callback.
       */
      getEmailEml(id: string, callback?: (error: Error) => void): void;
  
      /**
       * Returns a readable stream of the raw e-mail.
       *
       * @param id The e-mail identifier.
       * @param callback The callback
       */
      getRawEmail(id: string, callback?: (error: Error, readStream: fs.ReadStream) => void): void;
  
      /**
       * Returns array of all e-mail.
       */
      getAllEmail(done: (error: Error, emails: Array<Object>) => void): void;
  
      /**
       * Starts the SMTP server.
       *
       * @param callback The error callback.
       */
      listen(callback?: (error: Error) => void): void;
  
      /**
       * Event called when a new e-mail is received. Callback receives single mail object.
       *
       * @param  eventName The event name.
       * @param  email     The email.
       */
      on(eventName: string, callback: (email: Object) => void): void;
  
      /**
       * Event called when a mail server has an error
       *
       * @param  callback     The error callback.
       */
      onSmtpError(callback: (err: Error) => void): void;
  
      /**
       * Relay the e-mail.
       *
       * @param idOrMailObject The identifier or mail object.
       * @param done The callback.
       */
      relayMail(idOrMailObject: string, done: (error: Error) => void): void;
      relayMail(idOrMailObject: string|Mail, isAutoRelay: boolean, done: (error: Error) => void): void;
  
      /**
       * Read all emails.
       */
      readAllEmail(done: (error: Error, emails: number) => void): void;
  
      /**
       * Setup outgoing.
       */
      setupOutgoing(host?: string, port?: number, user?: string, pass?: string, secure?: boolean): void;
  
      isOutgoingEnabled(): boolean;
  
      getOutgoingHost(): string;
  
      setAutoRelayMode(enabled: boolean, rules?: string | string[], emailAddress?: string): void;
  
      loadMailsFromDirectory(): void;
    }
  
    var out: typeof MailDev;
    export = out;
  }
