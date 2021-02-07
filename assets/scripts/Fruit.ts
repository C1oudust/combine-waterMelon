const {ccclass, property} = cc._decorator;

@ccclass
export default class Fruit extends cc.Component {
	// @property(cc.Label)
	id: Number = 0;

	// onLoad () {}

	start() {}

	init(data) {
		this.id = data.id;
		// 根据传入的参数修改贴图资源
		const sp = this.node.getComponent(cc.Sprite);
		sp.spriteFrame = data.iconSF;
	}

	onBeginContact(contact, self, other) {
		if (self.tag != other.tag) return;

		// 检测到是两个相同水果的碰撞
		if (self.node && other.node) {
			const s = self.node.getComponent('Fruit');
			const o = other.node.getComponent('Fruit');
			if (s && o && s.id === o.id) {
				self.node.emit('sameContact', {self, other});
			}
		}
	}

	onDestroy(): void {
		this.node.removeFromParent(false);
	}
	// update (dt) {}
}
