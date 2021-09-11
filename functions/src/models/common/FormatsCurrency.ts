export class FormatsCurrency {
  private formatter: Intl.NumberFormat;

  constructor(locale = "en-US") {
    this.formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  }

  formatTenths = (input: number) => {
    return this.formatter.format(input / 1000);
  };
}
