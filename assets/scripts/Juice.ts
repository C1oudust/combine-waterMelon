const {ccclass, property} = cc._decorator;
const RandomInteger = function (e, t) {
	return Math.floor(Math.random() * (t - e) + e);
};
@ccclass
export default class Juice extends cc.Component {
	// @property(cc.SpriteFrame)
	particle: cc.SpriteFrame = null;
	// @property(cc.SpriteFrame)
	circle: cc.SpriteFrame = null;
	// @property(cc.SpriteFrame)
	slash: cc.SpriteFrame = null;

	init(data) {
		this.particle = data.particle;
		this.circle = data.particle;
    this.slash = data.slash;
	}

	// 合并时的动画效果
	showJuice(pos, width) {
		// 果粒
		for (let i = 0; i < 10; ++i) {
			const node = new cc.Node('Sprite');
			const sp = node.addComponent(cc.Sprite);

			sp.spriteFrame = this.particle;
			node.parent = this.node;

			const a = 359 * Math.random(),
				i = 30 * Math.random() + width / 2,
				l = cc.v2(
					Math.sin((a * Math.PI) / 180) * i,
					Math.cos((a * Math.PI) / 180) * i
				);
			node.scale = 0.5 * Math.random() + width / 100;
			const p = 0.5 * Math.random();

      node.position = pos;
      
			node.runAction(
				cc.sequence(
					cc.spawn(
						cc.moveBy(p, l),
						cc.scaleTo(p + 0.5, 0.3),
						cc.rotateBy(p + 0.5, RandomInteger(-360, 360))
					),
					cc.fadeOut(0.1),
					cc.callFunc(function () {
						node.active = false;
					}, this)
				)
			);
		}

		// 水珠
		for (let f = 0; f < 20; f++) {
			const node = new cc.Node('Sprite');
			const sp = node.addComponent(cc.Sprite);

			sp.spriteFrame = this.circle;
			node.parent = this.node;

			let a = 359 * Math.random(),
				i = 30 * Math.random() + width / 2,
				l = cc.v2(
					Math.sin((a * Math.PI) / 180) * i,
					Math.cos((a * Math.PI) / 180) * i
				);
			node.scale = 0.5 * Math.random() + width / 100;
			let p = 0.5 * Math.random();
			node.position = pos;
			node.runAction(
				cc.sequence(
					cc.spawn(cc.moveBy(p, l), cc.scaleTo(p + 0.5, 0.3)),
					cc.fadeOut(0.1),
					cc.callFunc(function () {
						node.active = false;
					}, this)
				)
			);
		}

		// 果汁
		const node = new cc.Node('Sprite');
		const sp = node.addComponent(cc.Sprite);

		sp.spriteFrame = this.slash;
		node.parent = this.node;

		node.position = pos;
		node.scale = 0;
		node.angle = RandomInteger(0, 360);
		node.runAction(
			cc.sequence(
				cc.spawn(cc.scaleTo(0.2, width / 150), cc.fadeOut(1)),
				cc.callFunc(function () {
					node.active = false;
				})
			)
		);
	}
}
