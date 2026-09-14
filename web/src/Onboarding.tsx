import { useEffect, useState } from 'react';
import type { UiCopy } from './copy';

export function OnboardingModal({ copy, onClose }: { copy: UiCopy; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const step = copy.tutorialSteps[index];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < copy.tutorialSteps.length - 1)
        setIndex((value) => value + 1);
      if (event.key === 'ArrowLeft' && index > 0) setIndex((value) => value - 1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [copy.tutorialSteps.length, index, onClose]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
      >
        <button className="modal-skip" onClick={onClose}>
          {copy.tutorialSkip}
        </button>
        <div className="tutorial-media">
          <img src={`/assets/tutorial/step-${index + 1}.png`} alt={step.imageAlt} />
        </div>
        <div className="tutorial-copy">
          <p className="eyebrow">{step.eyebrow}</p>
          <h2 id="tutorial-title">{index === 0 ? copy.tutorialTitle : step.title}</h2>
          {index === 0 && <p className="tutorial-intro">{copy.tutorialIntro}</p>}
          {index !== 0 && <p>{step.body}</p>}
          {index === 0 && (
            <>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </>
          )}
          <div className="tutorial-dots" aria-label={`${index + 1}/${copy.tutorialSteps.length}`}>
            {copy.tutorialSteps.map((item, stepIndex) => (
              <button
                key={item.title}
                className={stepIndex === index ? 'active' : ''}
                onClick={() => setIndex(stepIndex)}
                aria-label={item.title}
              />
            ))}
          </div>
          <div className="tutorial-actions">
            <button
              className="button ghost"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              {copy.tutorialPrevious}
            </button>
            {index === copy.tutorialSteps.length - 1 ? (
              <button className="button primary" onClick={onClose}>
                {copy.tutorialFinish}
              </button>
            ) : (
              <button className="button primary" onClick={() => setIndex(index + 1)}>
                {copy.tutorialNext}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
