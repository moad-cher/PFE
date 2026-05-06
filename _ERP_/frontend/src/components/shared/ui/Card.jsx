const VARIANTS = {
  panel: 'bg-white rounded-xl shadow-lilac border border-purple-100/50',
  panelLg: 'bg-white rounded-2xl shadow-lilac border border-purple-100/50',
};

export default function Card({
  as: Component = 'div',
  variant = 'panel',
  interactive = false,
  className = '',
  ...props
}) {
  const baseClass = VARIANTS[variant] || VARIANTS.panel;
  const interactiveClass = interactive ? 'transition-all card-hover' : '';
  const classes = [baseClass, interactiveClass, className].filter(Boolean).join(' ');

  return <Component className={classes} {...props} />;
}
