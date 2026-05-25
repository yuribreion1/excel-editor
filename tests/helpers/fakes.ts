import * as vscode from 'vscode';

type MessageListener = (message: unknown) => void | Promise<void>;

export class FakeWebview {
  public html = '';
  public readonly cspSource = 'https://example.test';
  public readonly postedMessages: unknown[] = [];
  private listener?: MessageListener;

  public asWebviewUri(uri: vscode.Uri): vscode.Uri {
    return uri;
  }

  public onDidReceiveMessage(listener: MessageListener): vscode.Disposable {
    this.listener = listener;
    return new vscode.Disposable(() => {
      this.listener = undefined;
    });
  }

  public async postMessage(message: unknown): Promise<boolean> {
    this.postedMessages.push(message);
    return true;
  }

  public async send(message: unknown): Promise<void> {
    await this.listener?.(message);
  }
}

export class FakeWebviewPanel {
  public readonly webview = new FakeWebview();
  public title = '';

  public onDidDispose(): vscode.Disposable {
    return new vscode.Disposable(() => undefined);
  }
}
