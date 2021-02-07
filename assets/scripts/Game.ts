const {ccclass, property} = cc._decorator;
// @ccclass

// export class FruitItem extends cc.Component{
//     @property(cc.Integer)
//     id = 0;

//     @property(cc.SpriteFrame)
//     iconSF: cc.SpriteFrame = null;
// }

const FruitItem = cc.Class({
	name: 'FruitItem',
	properties: {
		id: 0,
		iconSF: cc.SpriteFrame,
	},
});

const JuiceItem = cc.Class({
	name: 'JuiceItem',
	properties: {
		id: 0,
		particle: cc.SpriteFrame, // 果粒
		circle: cc.SpriteFrame, // 水珠
		slash: cc.SpriteFrame, // 果汁
	},
});

@ccclass
export default class Game extends cc.Component {
	@property(cc.Node)
	fruitContainer: cc.Node = null;

	@property(cc.Node)
	canvas: cc.Node = null;

	@property(cc.Node)
	successPop: cc.Node = null;

	@property(cc.Prefab)
	fruitPrefab: cc.Prefab = null;

	@property(cc.Prefab)
	juicePrefab: cc.Prefab = null;

	@property(cc.Sprite)
	nextSprite: cc.Sprite = null;

	@property(cc.AudioClip)
	boomAudio: cc.AudioClip = null;

	@property(cc.AudioClip)
	knockAudio: cc.AudioClip = null;

	@property(cc.AudioClip)
	waterAudio: cc.AudioClip = null;

	@property(cc.Label)
	scoreLabel: cc.Label = null;

	@property([FruitItem])
	fruits: any[] = [];

	@property([JuiceItem])
	juices: any[] = [];

	nextFruit: cc.Node = null;
	score: number = 0;
	isAnimtionPlaying: boolean = false;
	isCreating: boolean = false;
	createOneFruit(num): cc.Node {
		let fruit = cc.instantiate(this.fruitPrefab);

		// 获取到配置信息
		const config = this.fruits[num];

		// 获取到节点的Fruit组件并调用实例方法
		fruit.getComponent('Fruit').init({
			id: config.id,
			iconSF: config.iconSF,
		});

		fruit.getComponent(cc.RigidBody).type = cc.RigidBodyType.Dynamic;
		const physicsCircleCollider = fruit.getComponent(cc.PhysicsCircleCollider);
		physicsCircleCollider.radius = fruit.height / 2;
		physicsCircleCollider.apply();

		fruit.on('sameContact', ({self, other}) => {
			other.node.off('sameContact');
			this.onSameFruitContact({self, other});
		});

		return fruit;
	}

	onSameFruitContact({self, other}) {
		other.node.off('sameContact');
		self.node.removeFromParent(false);
		other.node.removeFromParent(false);
		// 获取下面的node
		let tempNode = self.node.y < other.node.y ? self.node : other.node;
		const {x, y} = tempNode; // 获取合并的水果位置
		const id = other.getComponent('Fruit').id;

		// self.node.destroy();
		// other.node.destroy();
		// 爆炸特效
		this.createFruitJuice(id - 1, cc.v2({x, y}), tempNode.width);

		this.addScore(id);
		// 生成下一级水果
		const nextId = id;

		const newFruit = this.createOneFruit(nextId);
		newFruit.setPosition(cc.v2(x, y));
		newFruit.getComponent(cc.RigidBody).enabledContactListener = false;
		this.scheduleOnce(() => {
			newFruit.getComponent(cc.RigidBody).enabledContactListener = true;
		}, 0.5);
		this.fruitContainer.addChild(newFruit);
		if (nextId < 10) {
			newFruit.scale = 0;
			cc.tween(newFruit)
				.to(
					0.5,
					{
						scale: 1,
					},
					{
						easing: 'backOut',
					}
				)
				.start();
		} else if (nextId == 10) {
			this.onCombineWaterMelon();
		} else {
			// todo: 合成两个西瓜
			console.log('合成两个西瓜，还没做，感觉没人合到这块');
		}
	}
	// 合并时的动画效果
	async createFruitJuice(id, pos, n) {
		if (this.isAnimtionPlaying) return;

		this.isAnimtionPlaying = true;
		// 播放合并的声音
		cc.audioEngine.play(this.boomAudio, false, 1);
		cc.audioEngine.play(this.waterAudio, false, 1);

		// 展示动画
		let juice = cc.instantiate(this.juicePrefab);
		this.fruitContainer.addChild(juice);

		const config = this.juices[id];
		const instance = juice.getComponent('Juice');
		instance.init(config);
		await instance.showJuice(pos, n);
		this.isAnimtionPlaying = false;
	}
	// 添加得分分数
	addScore(fruitId) {
		this.score += fruitId * 2;
		// todo: 处理分数tween动画
		this.scoreLabel.string = this.score.toString();
	}
	initPhysics(): void {
		// 开启物理引擎
		const instance = cc.director.getPhysicsManager();
		instance.enabled = true;
		// instance.debugDrawFlags = 4
		instance.gravity = cc.v2(0, -960);

		// 开启碰撞检测
		var manager = cc.director.getCollisionManager();
		manager.enabled = true;
		manager.enabledDebugDraw = true;

		// 设置四周的碰撞区域
		let width = this.canvas.width;
		let height = this.canvas.height;

		let node = new cc.Node();

		let body = node.addComponent(cc.RigidBody);
		body.type = cc.RigidBodyType.Static;

		const _addBound = (node, x, y, width, height) => {
			let collider = node.addComponent(cc.PhysicsBoxCollider);
			collider.offset.x = x;
			collider.offset.y = y;
			collider.size.width = width;
			collider.size.height = height;
		};

		_addBound(node, 0, -height / 2, width, 1);
		_addBound(node, 0, height / 2, width, 1);
		_addBound(node, -width / 2, 0, 1, height);
		_addBound(node, width / 2, 0, 1, height);

		node.parent = this.canvas;
	}

	onLoad() {
		this.initPhysics();
		this.canvas.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
		this.successPop.active = false;
		this.successPop.on(
			cc.Node.EventType.TOUCH_START,
			() => {
				this.successPop.active = false;
				this.successPop.children.forEach((child) => {
					if (child.name != 'bg') {
						child.destroy();
					}
				});
			},
			this
		);
		this.nextFruit = this.createOneFruit(0);
		this.nextSprite.spriteFrame = this.fruits[0].iconSF;
	}
	// 在指定位置生成水果
	createFruitOnPos(x = this.canvas.width / 2, y = -20) {
		// console.log(e.getLocationX());
		// let num = ~~(Math.random() * ( this.fruits.length));
		// 最多随机到第5个水果
		let nextId = ~~(Math.random() * 5);
		// let nextId = 9;
		const fruit = this.nextFruit;
		fruit.setPosition(cc.v2(x, y));
		this.fruitContainer.addChild(fruit);
		this.nextSprite.spriteFrame = null;

		this.scheduleOnce(() => {
			this.nextSprite.spriteFrame = this.fruits[nextId].iconSF;
			this.nextSprite.node.scale = 0;
			this.nextFruit = this.createOneFruit(nextId);
			cc.tween(this.nextSprite.node)
				.to(
					0.4,
					{
						scale: 0.6,
					},
					{
						easing: 'backOut',
					}
				)
				.call(() => {
					this.isCreating = false;
				})
				.start();
		}, 0.5);
	}

	onTouchStart(e) {
		if (this.isCreating) return;
		this.isCreating = true;
		// 在点击位置生成一个水果
		this.createFruitOnPos(e.getLocationX());
	}

	onCombineWaterMelon() {
		console.log('合成了一个西瓜，你就是最靓的仔！');
		var big = new cc.Node('Sprite');
		const sp = big.addComponent(cc.Sprite);
		sp.spriteFrame = this.fruits[10].iconSF;
		big.setScale(0.5);
		// big.setPosition(cc.v2({x, y}));
		big.setPosition(cc.v2(0, -this.canvas.height / 2 + big.height / 2));
		this.successPop.addChild(big);
		this.successPop.active = true;
		// big.runAction(
		// 	cc.sequence(
		// 		cc.delayTime(0.5),
		// 	cc.moveTo(1, cc.v2(this.canvas.width / 2, -this.canvas.height / 2))
		// 	)
		// );
		cc.tween(big)
			.to(1, {
				scale: 1,
				position: cc.v3(0, 0),
				// scale: 1,
			})
			.call(() => {
				// big.removeFromParent();
				let node = new cc.Node();
				node.setPosition(0, 0);
				node.addComponent(cc.Label).string = '你就是最靓的仔！';
				this.successPop.addChild(node);
			})
			.start();
	}

	update(): void {
		// todo: 游戏失败判定
		// let maxHeight:number = -this.canvas.height;
		let height: cc.Node[] = [];
		this.fruitContainer.children.forEach((child) => {
			// console.log(child);
			height.push(child);
		});
		height.sort(function (a: cc.Node, b: cc.Node) {
			return b.y - a.y;
		});
		if (height[0] && height[0].y > -100) {
			// console.log('over');
		}
	}
	start() {}

	// update (dt) {}
}
