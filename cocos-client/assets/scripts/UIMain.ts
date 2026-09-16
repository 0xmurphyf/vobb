import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Color, UITransform, Widget, EventTouch, EventHandler } from 'cc'
import { CONFIG, FACTIONS, FACTION_COLORS, FACTION_ORDER } from '../scripts/config'
import { state, fmt, guestLogin } from '../scripts/game'

const { ccclass, property } = _decorator

@ccclass('UIMain')
export class UIMain extends Component {
  @property(Node) topbar: Node | null = null
  @property(Node) roster: Node | null = null
  @property(Node) viewport: Node | null = null
  @property(Node) panel: Node | null = null
  @property(Node) menuPanel: Node | null = null
  @property(Label) titleLabel: Label | null = null
  @property(Label) gemsLabel: Label | null = null
  @property(Label) goldLabel: Label | null = null
  @property(Label) staminaLabel: Label | null = null

  private _currentScreen: string = 's-char'

  start() {
    this._initUI()
    guestLogin()
    this._refresh()
  }

  private _initUI() {
    // Topbar
    if (this.titleLabel) {
      this.titleLabel.string = 'CHARACTER'
    }
  }

  private _refresh() {
    if (!state.player) return
    if (this.gemsLabel) {
      const g = state.player.currencies.find(c => c.type === 'gems')
      this.gemsLabel.string = g ? fmt(g.amount) : '0'
    }
    if (this.goldLabel) {
      const g = state.player.currencies.find(c => c.type === 'gold')
      this.goldLabel.string = g ? fmt(g.amount) : '0'
    }
    if (this.staminaLabel) {
      const s = state.player.currencies.find(c => c.type === 'stamina')
      this.staminaLabel.string = (s ? s.amount : 0) + '/100'
    }
    if (this.roster) this._renderRoster()
    if (this.viewport) this._renderViewport()
    if (this.panel) this._renderPanel()
  }

  private _renderRoster() {
    if (!this.roster) return
    this.roster.destroyChildren()
    state.chars.forEach((c, i) => {
      const item = new Node('RosterItem')
      item.parent = this.roster
      item.addComponent(UITransform).setContentSize(100, 100)
      const sprite = item.addComponent(Sprite)
      sprite.color = new Color(80, 80, 160, 80)
      sprite.sizeMode = Sprite.SizeMode.CUSTOM
      const lbl = item.addComponent(Label)
      lbl.string = `${c.character.faction[0]}\n${c.character.rarity}\nLv.${c.level}`
      lbl.fontSize = 12
      lbl.lineHeight = 16
      lbl.color = i === state.idx ? new Color(255, 215, 0, 255) : Color.WHITE
      lbl.horizontalAlign = Label.HorizontalAlign.CENTER
      lbl.verticalAlign = Label.VerticalAlign.CENTER
    })
  }

  private _renderViewport() {
    if (!this.viewport) return
    this.viewport.destroyChildren()
    if (state.chars.length === 0) return
    const c = state.chars[state.idx]
    const art = new Node('Artwork')
    art.parent = this.viewport
    art.addComponent(UITransform).setContentSize(500, 500)
    const artSprite = art.addComponent(Sprite)
    artSprite.color = new Color(100, 100, 200, 70)
    artSprite.sizeMode = Sprite.SizeMode.CUSTOM
    const lbl = art.addComponent(Label)
    lbl.string = `${c.character.name}\n${'★'.repeat(c.star)}${'☆'.repeat(5 - c.star)}\nLv.${c.level}`
    lbl.fontSize = 14
    lbl.lineHeight = 20
    lbl.color = Color.WHITE
    lbl.horizontalAlign = Label.HorizontalAlign.CENTER
    lbl.verticalAlign = Label.VerticalAlign.CENTER
  }

  private _renderPanel() {
    if (!this.panel) return
    this.panel.destroyChildren()
    if (state.chars.length === 0) return
    const c = state.chars[state.idx]
    const power = c.currentHp + c.currentAtk + c.currentDef + c.currentWis + c.currentAgi
    const stats = [
      { key: 'HP', value: c.currentHp, icon: '❤️' },
      { key: 'ATK', value: c.currentAtk, icon: '⚔️' },
      { key: 'DEF', value: c.currentDef, icon: '🛡️' },
      { key: 'WIS', value: c.currentWis, icon: '✨' },
      { key: 'AGI', value: c.currentAgi, icon: '💨' },
    ]
    let y = 0
    stats.forEach(s => {
      const row = new Node(`Stat_${s.key}`)
      row.parent = this.panel
      row.addComponent(UITransform).setContentSize(400, 40)
      const bg = row.addComponent(Sprite)
      bg.color = new Color(26, 26, 64, 130)
      bg.sizeMode = Sprite.SizeMode.CUSTOM
      const lbl = row.addComponent(Label)
      lbl.string = `${s.icon} ${s.key} ${fmt(s.value)}`
      lbl.fontSize = 14
      lbl.lineHeight = 16
      lbl.color = Color.WHITE
      row.setPosition(0, y)
      y -= 45
    })
    const pw = new Node('Power')
    pw.parent = this.panel
    pw.addComponent(UITransform).setContentSize(400, 50)
    const pbg = pw.addComponent(Sprite)
    pbg.color = new Color(244, 196, 48, 30)
    pbg.sizeMode = Sprite.SizeMode.CUSTOM
    const plbl = pw.addComponent(Label)
    plbl.string = `POWER ${fmt(power)}`
    plbl.fontSize = 16
    plbl.lineHeight = 18
    plbl.color = new Color(244, 196, 48, 255)
    pw.setPosition(0, y)
    y -= 60
    const btn = new Node('Upgrade')
    btn.parent = this.panel
    btn.addComponent(UITransform).setContentSize(400, 50)
    const bsp = btn.addComponent(Sprite)
    bsp.color = new Color(50, 152, 220, 100)
    bsp.sizeMode = Sprite.SizeMode.CUSTOM
    const blbl = btn.addComponent(Label)
    blbl.string = 'UPGRADE'
    blbl.fontSize = 14
    blbl.lineHeight = 16
    blbl.color = Color.WHITE
    btn.setPosition(0, y)
  }

  // Navigation
  onMenuToggle() {
    if (this.menuPanel) {
      this.menuPanel.active = !this.menuPanel.active
    }
  }

  onScreenTap(data: string) {
    this._currentScreen = data
    this._refresh()
  }

  selectRoster(i: number) {
    state.idx = i
    this._refresh()
  }
}
