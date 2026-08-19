export class WSWrapper {
  private readonly ws: WebSocket;
  private closed: boolean;
  private canClose: boolean;
  private firstCallback: () => void;

  constructor(url: string, props?: WSProps) {
    this.closed = false;
    this.canClose = false;

    this.ws = new WebSocket(url);

    this.firstCallback = () => {
      if (this.canClose) return;

      console.log("WSWrapper.firstCallback(): marking canClose");
      this.canClose = true;
      if (this.closed) {
        console.log("WSWrapper.firstCallback(): closing");
        this.ws.close();
      }
      ["open", "error"].forEach(e => this.ws.removeEventListener(e, this.firstCallback));
    };

    ["open", "error"].forEach(e => this.ws.addEventListener(e, this.firstCallback));

    props?.onOpen && this.ws.addEventListener("open", props.onOpen);
    props?.onMessage && this.ws.addEventListener("message", props.onMessage);
    props?.onError && this.ws.addEventListener("error", props.onError);
    props?.onClose && this.ws.addEventListener("close", props.onClose);
  }

  public close() {
    if (this.closed) return;

    console.log("WSWrapper.close(): marking closed");

    this.closed = true;
    if (this.canClose) {
      console.log("WSWrapper.close(): closing");
      this.ws.close();
    }
  }
}

export interface WSProps {
  onOpen?: (e: Event) => void;
  onMessage?: (e: MessageEvent) => void;
  onError?: (e: Event) => void;
  onClose?: (e: CloseEvent) => void;
}
