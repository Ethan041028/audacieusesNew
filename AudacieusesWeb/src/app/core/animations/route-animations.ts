import { trigger, transition, style, animate, query, group } from '@angular/animations';

export const fadeAnimation = trigger('fadeAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('0.3s ease-in', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('0.3s ease-out', style({ opacity: 0 })),
  ]),
]);

export const slideInAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('300ms ease-out', 
          style({ opacity: 0, transform: 'translateY(-20px)' }))
      ], { optional: true }),
      query(':enter', [
        animate('300ms ease-in', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ])
]);

// Animation spécifique pour les formulaires
export const formAnimation = trigger('formAnimation', [
  transition(':enter', [
    query('.form-group', [
      style({ opacity: 0, transform: 'translateY(20px)' }),
      animate('300ms ease-out', 
        style({ opacity: 1, transform: 'translateY(0)' }))
    ], { optional: true })
  ])
]);

// Animation pour les messages d'alerte
export const alertAnimation = trigger('alertAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
]);