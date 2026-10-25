/**
 * Icônes Lucide — la même bibliothèque que le site (lucide-react).
 *
 * L'app utilisait Ionicons, d'où un trait et des pictos différents du site.
 * Ce composant garde l'API d'Ionicons (`name`, `size`, `color`) pour que
 * chaque écran bascule sans réécriture : les noms Ionicons sont traduits vers
 * leur équivalent Lucide (celui qu'emploie le site quand il existe).
 */
import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
// Une icône = un fichier : Metro ne fait pas de tree-shaking, importer depuis
// 'lucide-react-native' embarquerait les ~1 600 icônes (+2 Mo de bundle).
import AlertCircle from 'lucide-react-native/icons/circle-alert';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import AlarmClock from 'lucide-react-native/icons/alarm-clock';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import ArrowUpCircle from 'lucide-react-native/icons/circle-arrow-up';
import Award from 'lucide-react-native/icons/award';
import BarChart3 from 'lucide-react-native/icons/chart-column';
import Bell from 'lucide-react-native/icons/bell';
import BellOff from 'lucide-react-native/icons/bell-off';
import BookOpen from 'lucide-react-native/icons/book-open';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Calculator from 'lucide-react-native/icons/calculator';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Circle from 'lucide-react-native/icons/circle';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import ClipboardCheck from 'lucide-react-native/icons/clipboard-check';
import Clock from 'lucide-react-native/icons/clock';
import Cloud from 'lucide-react-native/icons/cloud';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Code from 'lucide-react-native/icons/code';
import Compass from 'lucide-react-native/icons/compass';
import Cpu from 'lucide-react-native/icons/cpu';
import Crown from 'lucide-react-native/icons/crown';
import Diamond from 'lucide-react-native/icons/diamond';
import BookText from 'lucide-react-native/icons/book-text';
import Wrench from 'lucide-react-native/icons/wrench';
import Landmark from 'lucide-react-native/icons/landmark';
import PenTool from 'lucide-react-native/icons/pen-tool';
import Microscope from 'lucide-react-native/icons/microscope';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Expand from 'lucide-react-native/icons/expand';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import File from 'lucide-react-native/icons/file';
import FileText from 'lucide-react-native/icons/file-text';
import Files from 'lucide-react-native/icons/files';
import Flag from 'lucide-react-native/icons/flag';
import Flame from 'lucide-react-native/icons/flame';
import FlaskConical from 'lucide-react-native/icons/flask-conical';
import Gift from 'lucide-react-native/icons/gift';
import GitBranch from 'lucide-react-native/icons/git-branch';
import Glasses from 'lucide-react-native/icons/glasses';
import Globe from 'lucide-react-native/icons/globe';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Heart from 'lucide-react-native/icons/heart';
import HeartHandshake from 'lucide-react-native/icons/heart-handshake';
import Home from 'lucide-react-native/icons/house';
import Hourglass from 'lucide-react-native/icons/hourglass';
import ImageIcon from 'lucide-react-native/icons/image';
import Images from 'lucide-react-native/icons/images';
import Inbox from 'lucide-react-native/icons/inbox';
import Info from 'lucide-react-native/icons/info';
import Languages from 'lucide-react-native/icons/languages';
import Layers from 'lucide-react-native/icons/layers';
import Leaf from 'lucide-react-native/icons/leaf';
import Library from 'lucide-react-native/icons/library';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Link from 'lucide-react-native/icons/link';
import List from 'lucide-react-native/icons/list';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageCircleMore from 'lucide-react-native/icons/message-circle-more';
import MessagesSquare from 'lucide-react-native/icons/messages-square';
import Monitor from 'lucide-react-native/icons/monitor';
import Moon from 'lucide-react-native/icons/moon';
import Move from 'lucide-react-native/icons/move';
import Music from 'lucide-react-native/icons/music';
import Newspaper from 'lucide-react-native/icons/newspaper';
import Notebook from 'lucide-react-native/icons/notebook';
import Palette from 'lucide-react-native/icons/palette';
import Paperclip from 'lucide-react-native/icons/paperclip';
import PawPrint from 'lucide-react-native/icons/paw-print';
import PenLine from 'lucide-react-native/icons/pen-line';
import Pin from 'lucide-react-native/icons/pin';
import Play from 'lucide-react-native/icons/play';
import PlayCircle from 'lucide-react-native/icons/circle-play';
import Plus from 'lucide-react-native/icons/plus';
import Radio from 'lucide-react-native/icons/radio';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Scale from 'lucide-react-native/icons/scale';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import Shield from 'lucide-react-native/icons/shield';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldHalf from 'lucide-react-native/icons/shield-half';
import Shuffle from 'lucide-react-native/icons/shuffle';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Snowflake from 'lucide-react-native/icons/snowflake';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import Sun from 'lucide-react-native/icons/sun';
import ThumbsUp from 'lucide-react-native/icons/thumbs-up';
import Trash2 from 'lucide-react-native/icons/trash';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import Trophy from 'lucide-react-native/icons/trophy';
import Type from 'lucide-react-native/icons/type';
import Undo2 from 'lucide-react-native/icons/undo-2';
import User from 'lucide-react-native/icons/user';
import UserCircle from 'lucide-react-native/icons/circle-user';
import UserPlus from 'lucide-react-native/icons/user-plus';
import Users from 'lucide-react-native/icons/users';
import Wallet from 'lucide-react-native/icons/wallet';
import X from 'lucide-react-native/icons/x';
import XCircle from 'lucide-react-native/icons/circle-x';
import Zap from 'lucide-react-native/icons/zap';
import Activity from 'lucide-react-native/icons/activity';
import Maximize2 from 'lucide-react-native/icons/maximize-2';
import Orbit from 'lucide-react-native/icons/orbit';
import Medal from 'lucide-react-native/icons/medal';
import Swords from 'lucide-react-native/icons/swords';
import Network from 'lucide-react-native/icons/network';
import Album from 'lucide-react-native/icons/square-bookmark';
import Package from 'lucide-react-native/icons/package';
import Sword from 'lucide-react-native/icons/sword';
import Skull from 'lucide-react-native/icons/skull';
import Shirt from 'lucide-react-native/icons/shirt';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import Gem from 'lucide-react-native/icons/gem';
import CalendarCheck from 'lucide-react-native/icons/calendar-check';
import Target from 'lucide-react-native/icons/target';
import Backpack from 'lucide-react-native/icons/backpack';
import Timer from 'lucide-react-native/icons/timer';
import LockOpen from 'lucide-react-native/icons/lock-open';
import Footprints from 'lucide-react-native/icons/footprints';
import type { LucideIcon } from 'lucide-react-native';

const MAP: Record<string, LucideIcon> = {
    add: Plus, albums: Album, alert: AlertTriangle, 'alert-circle': AlertCircle,
    'arrow-back': ArrowLeft, 'arrow-forward': ArrowRight, 'arrow-undo': Undo2, 'arrow-up': ArrowUp, 'arrow-up-circle': ArrowUpCircle,
    attach: Paperclip, 'bar-chart': BarChart3, barbell: Dumbbell, book: BookOpen, bookmark: Bookmark, briefcase: Briefcase,
    bulb: Lightbulb, calculator: Calculator, calendar: Calendar, camera: Camera,
    chatbubble: MessageCircle, 'chatbubble-ellipses': MessageCircleMore, chatbubbles: MessagesSquare,
    checkmark: Check, 'checkmark-circle': CheckCircle2, 'checkmark-done': CheckCheck, 'checkmark-done-circle': CheckCheck,
    'chevron-back': ChevronLeft, 'chevron-down': ChevronDown, 'chevron-forward': ChevronRight, 'chevron-up': ChevronUp,
    clipboard: ClipboardCheck, close: X, 'close-circle': XCircle, 'cloud-offline': CloudOff, cloud: Cloud,
    'code-slash': Code, 'color-palette': Palette, compass: Compass, create: PenLine, desktop: Monitor, diamond: Diamond,
    'document-attach': File, 'document-text': FileText, documents: Files, earth: Globe, ellipse: Circle, expand: Maximize2,
    eye: Eye, 'eye-off': EyeOff, 'file-tray': Inbox, flag: Flag, flame: Flame, flash: Zap, flask: FlaskConical, gift: Gift,
    'git-branch': GitBranch, 'git-network': Network, glasses: Glasses, 'hardware-chip': Cpu, heart: Heart,
    'heart-circle': HeartHandshake, 'help-buoy': LifeBuoy, 'help-circle': CircleHelp, home: Home, hourglass: Hourglass,
    image: ImageIcon, images: Images, 'information-circle': Info, journal: Notebook, language: Languages, layers: Layers,
    leaf: Leaf, library: Library, link: Link, list: ListChecks, 'lock-closed': Lock, 'log-out': LogOut, 'logo-discord': MessagesSquare,
    mail: Mail, medal: Medal, moon: Moon, move: Move, 'musical-notes': Music, newspaper: Newspaper, notifications: Bell,
    'notifications-off': BellOff, open: ExternalLink, options: SlidersHorizontal, 'paper-plane': Send, paw: PawPrint,
    people: Users, person: User, 'person-add': UserPlus, 'person-circle': UserCircle, pin: Pin, planet: Orbit, play: Play,
    'play-circle': PlayCircle, podium: Award, pulse: Activity, radio: Radio, 'radio-button-off': Circle, 'radio-button-on': CircleDot,
    refresh: RefreshCw, resize: Expand, ribbon: Award, scale: Scale, school: GraduationCap, search: Search, send: Send,
    shield: Shield, 'shield-checkmark': ShieldCheck, 'shield-half': ShieldHalf, shuffle: Shuffle, snow: Snowflake,
    sparkles: Sparkles, star: Star, sunny: Sun, text: Type, 'thumbs-up': ThumbsUp, time: Clock, trash: Trash2,
    'trending-up': TrendingUp, trophy: Trophy, wallet: Wallet, warning: AlertTriangle, crown: Crown, swords: Swords,
    alarm: AlarmClock,
    // Gamification (aventure, quêtes, coffres, inventaire)
    cube: Package, sword: Sword, skull: Skull, shirt: Shirt, 'heart-pulse': HeartPulse, gem: Gem,
    'calendar-check': CalendarCheck, target: Target, backpack: Backpack, timer: Timer, 'lock-open': LockOpen, footprints: Footprints,
    'book-text': BookText, wrench: Wrench, landmark: Landmark, 'pen-tool': PenTool, microscope: Microscope,
};

/** Icônes « pleines » : Ionicons avait une variante remplie, Lucide la simule par un remplissage. */
const FILLABLE = new Set(['star', 'heart', 'bookmark', 'flame', 'pin', 'diamond']);

export type IconName = string;

function Icon({ name, size = 22, color = '#1A1512', style, strokeWidth }: {
    name: IconName;
    size?: number;
    color?: string;
    style?: StyleProp<ViewStyle>;
    strokeWidth?: number;
}) {
    const outline = name.endsWith('-outline');
    const base = outline ? name.slice(0, -'-outline'.length) : name;
    const Cmp = MAP[base] ?? MAP[name] ?? Circle;
    const filled = !outline && FILLABLE.has(base);
    return (
        <Cmp
            size={size}
            color={color}
            strokeWidth={strokeWidth ?? (size <= 16 ? 2.25 : 2)}
            fill={filled ? color : 'none'}
            style={style as any}
        />
    );
}

export default memo(Icon);
