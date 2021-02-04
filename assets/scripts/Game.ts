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
			// 两个node都会触发，临时处理，看看有没有其他方法只展示一次的
			other.node.off('sameContact');
			// 处理水果合并的逻辑，下面再处理
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
		// 爆炸特效
		this.createFruitJuice(id - 1, cc.v2({x, y}), tempNode.width);

		this.addScore(id);
		// 生成下一级水果
		const nextId = id;

		const newFruit = this.createOneFruit(nextId);
		newFruit.setPosition(cc.v2(x, y));
		newFruit.getComponent(cc.RigidBody).enabledContactListener = false;
		this.scheduleOnce(()=>{
			newFruit.getComponent(cc.RigidBody).enabledContactListener = true;
		},0.5)
		this.fruitContainer.addChild(newFruit);

		if (nextId <= 11) {
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
		} else {
			// todo: 合成两个西瓜
			console.log('合成两个西瓜');
		}
	}
	// 合并时的动画效果
	async createFruitJuice(id, pos, n) {
		if (this.isAnimtionPlaying) return;

		this.isAnimtionPlaying = true;
		// 播放合并的声音
		// cc.audioEngine.play(this.boomAudio, false, 1);
		// cc.audioEngine.play(this.waterAudio, false, 1);

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
		this.nextFruit = this.createOneFruit(0);
		this.nextSprite.spriteFrame = this.fruits[0].iconSF;
	}
	// 在指定位置生成水果
	createFruitOnPos(x = this.canvas.width / 2, y = -20) {
		// console.log(e.getLocationX());
		// let num = ~~(Math.random() * ( this.fruits.length));
		// 最多随机到第5个水果
		let nextId = ~~(Math.random() * 5);
		const fruit = this.nextFruit;
		fruit.setPosition(cc.v2(x, y));
		this.fruitContainer.addChild(fruit);
		this.nextSprite.spriteFrame = null;

		this.scheduleOnce(() => {
			this.nextSprite.spriteFrame = this.fruits[nextId].iconSF;
			this.nextSprite.node.scale = 0;
			cc.tween(this.nextSprite.node)
				.to(
					0.5,
					{
						scale: 0.6,
					},
					{
						easing: 'backOut',
					}
				)
				.start();
				this.scheduleOnce(()=>{
					this.isCreating = false;
				},0.6)
			this.nextFruit = this.createOneFruit(nextId);
			
		}, 1);
		// console.log(fruit);
	}

	onTouchStart(e) {
		if (this.isCreating) return;
		this.isCreating = true;

		// 在点击位置生成一个水果
		this.createFruitOnPos(e.getLocationX());
	}

	start() {}

	// update (dt) {}
}
