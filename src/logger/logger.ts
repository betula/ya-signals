export class NamedLogger {
  constructor(private name: string) {};

  log(...args: any[]) {
    console.log(this.name + ': ' + args.join(' '));
  }
  info(...args: any[]) {
    console.info(this.name + ': ' + args.join(' '));
  }
  error(...args: any[]) {
    console.error(this.name + ': ' + args.join(' '));
  }
  warn(...args: any[]) {
    console.warn(this.name + ': ' + args.join(' '));
  }
}