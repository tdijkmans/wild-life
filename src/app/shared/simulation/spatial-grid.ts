/** Allocation-light spatial index for bounded two-dimensional agent worlds. */
export class SpatialGrid {
  private readonly cells = new Map<number, number[]>();
  private readonly columns: number;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly size: number,
  ) {
    this.columns = Math.ceil(width / size);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(index: number, x: number, y: number): void {
    const key = this.key(x, y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(index);
  }

  forNearby(x: number, y: number, callback: (index: number) => void): void {
    const col = Math.floor(x / this.size);
    const row = Math.floor(y / this.size);
    const maxRow = Math.floor(this.height / this.size);
    for (let cy = Math.max(0, row - 1); cy <= Math.min(maxRow, row + 1); cy++) {
      for (let cx = Math.max(0, col - 1); cx <= Math.min(this.columns - 1, col + 1); cx++) {
        const cell = this.cells.get(cy * this.columns + cx);
        if (cell) for (const index of cell) callback(index);
      }
    }
  }

  private key(x: number, y: number): number {
    const cx = Math.min(this.columns - 1, Math.max(0, Math.floor(x / this.size)));
    const cy = Math.max(0, Math.floor(y / this.size));
    return cy * this.columns + cx;
  }
}
