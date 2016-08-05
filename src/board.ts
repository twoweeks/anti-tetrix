import {
    Object3D,
    MeshBasicMaterial,
    Mesh,
    BoxBufferGeometry,
    BoxHelper,
} from "three";
import { default as Tetrimino, TetriminoShape } from "tetrimino";

export default class Board {
    public object: Object3D;
    public speed = 1;
    public current: Tetrimino;
    public gameOver = false;
    public speedUp = false;
    public matrix: Object3D[][];

    static maxSpeed = Tetrimino.size / 4;

    constructor(public width = 10, public height = 16) {
        this.matrix = _.range(0, height).map(y => _.range(0, width).map(_.constant(null)));
        let geometry = new BoxBufferGeometry(
            width * Tetrimino.size,
            height * Tetrimino.size,
            Tetrimino.size
        );
        let material = new MeshBasicMaterial();
        let mesh = new Mesh(geometry, material);
        this.object = new Object3D();
        this.object.add(new BoxHelper(mesh));
    }

    public update() {
        if (this.gameOver) {
            return;
        }
        if (!this.current) {
            this.current = this.spawnNext();
        }

        let spawnNext = this.updateCurrent();
        if (spawnNext) {
            this.gameOver = this.current.getTopY() == this.getTopY();
            this.speedUp = false;
            this.current = null;
        }
    }

    public updateCurrent(): boolean {
        let tetrimino = this.current;
        let speed = (this.speedUp) ? Board.maxSpeed : this.speed;
        let bottomY = tetrimino.getBottomY() - speed;
        if (bottomY <= this.getBottomY()) {
            this.occupy(tetrimino, this.getBottomY());
            return true;
        }

        let collision = this.detectCollision(tetrimino, speed);
        if (collision) {
            this.occupy(tetrimino, Math.round(bottomY / Tetrimino.size) * Tetrimino.size);
            return true;
        }
        tetrimino.object.position.y -= speed;
        return false;
    }

    public spawnNext() {
        let shapes = Tetrimino.getShapes();
        let shape = shapes[_.random(0, shapes.length - 1)];
        return this.spawn(shape);
    }

    public detectCollision(tetrimino: Tetrimino, dy: number = 0, dx: number = 0): boolean {
        let topY = tetrimino.getTopY() - dy;
        let leftX = tetrimino.getLeftX() - dx;

        let startX = leftX / Tetrimino.size + this.width / 2;
        let startY = Math.max(0, this.height / 2 - Math.floor(topY / Tetrimino.size));

        let self = this;
        return tetrimino.matrix.some(function (row, y) {
            return row.some(function (node, x) {
                let dy = Math.min(self.height - 1, startY + y);
                let dx = startX + x;
                return node && self.matrix[dy][dx] != null;
            });
        });
    }

    public occupy(tetrimino: Tetrimino, setBottomY: number) {
        tetrimino.object.position.y = setBottomY + tetrimino.getHeight() / 2;

        let startX = tetrimino.getLeftX() / Tetrimino.size + this.width / 2;
        let startY = Math.max(0, Math.round(this.height / 2 - tetrimino.getTopY() / Tetrimino.size));
        for (let y = 0; y < tetrimino.matrix.length; y++) {
            for (let x = 0; x < tetrimino.matrix[0].length; x++) {
                let dy = Math.min(this.height - 1, startY + y);
                let dx = startX + x;
                if (tetrimino.matrix[y][x] == 0) {
                    continue;

                }
                let object = new Mesh(tetrimino.geometry, tetrimino.material);
                object.position.x = dx * Tetrimino.size - (this.getWidth() - Tetrimino.size) / 2;
                object.position.y = this.getTopY() - dy * Tetrimino.size - Tetrimino.size / 2;
                this.matrix[dy][dx] = object;
                this.object.add(object);
                this.object.remove(tetrimino.object);
            }
        }
        this.clearFullRows();
    }

    public clearFullRows() {
        for (let y = this.matrix.length - 1; y >= 0;) {
            let row = this.matrix[y];
            if (_.includes(row, null)) {
                y--;
                continue;
            }
            row.forEach((object, x) => {
                this.object.remove(object);
                this.matrix[y][x] = null;
            });
            for (let dy = y; dy > 0; dy--) {
                this.matrix[dy - 1].forEach((object, x) => {
                    if (object) {
                        this.matrix[dy - 1][x] = null;
                        this.matrix[dy][x] = object;
                        object.position.y -= Tetrimino.size;
                    }
                })
            }
        }
    }

    public spawn(shape: TetriminoShape) {
        let tetrimino = new Tetrimino(shape);
        let object = tetrimino.object;
        object.position.y = this.getTopY() - tetrimino.getHeight() / 2;
        object.position.x = (this.getWidth() - tetrimino.getWidth()) / 2 % Tetrimino.size;
        this.object.add(object);
        return tetrimino;
    }

    public getTopY() {
        return this.height / 2 * Tetrimino.size;

    }

    public getBottomY() {
        return -this.getTopY();
    }

    public getWidth() {
        return this.width * Tetrimino.size;
    }

    public getHeight() {
        return this.height * Tetrimino.size;
    }

    public moveCurrentLeft() {
        let noBorder = this.current.getLeftX() > -this.getWidth() / 2;
        let collision = this.detectCollision(this.current, 0, Tetrimino.size);
        if (noBorder && !collision) {
            this.current.object.position.x -= Tetrimino.size;
        }
    }

    public moveCurrentRight() {
        let noBorder = this.current.getRightX() < this.getWidth() / 2;
        let collision = this.detectCollision(this.current, 0, -Tetrimino.size);
        if (noBorder && !collision) {
            this.current.object.position.x += Tetrimino.size;
        }
    }

    public rotateCurrent() {
        this.current.rotate();
        let maxX = this.getWidth() / 2;
        if (this.current.getRightX() > maxX) {
            this.current.object.position.x = maxX - this.current.getWidth() / 2;
        }
    }
}