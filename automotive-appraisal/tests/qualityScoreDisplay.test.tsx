import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QualityScoreDisplay } from '../src/renderer/components/QualityScoreDisplay';
import { QualityScoreBreakdown } from '../src/types';

describe('QualityScoreDisplay', () => {
  const createMockBreakdown = (overrides: Partial<QualityScoreBreakdown> = {}): QualityScoreBreakdown => ({
    baseScore: 100,
    distancePenalty: 0,
    agePenalty: 0,
    ageBonus: 0,
    mileagePenalty: 0,
    mileageBonus: 10,
    equipmentPenalty: 0,
    equipmentBonus: 5,
    finalScore: 92.5,
    explanations: {
      distance: 'Within 100 miles',
      age: 'Same year',
      mileage: 'Within 20% of loss vehicle',
      equipment: 'Similar equipment'
    },
    ...overrides
  });

  describe('Score Badge Display', () => {
    it('should display score with correct formatting', () => {
      const breakdown = createMockBreakdown({ finalScore: 92.5 });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      const scores = screen.getAllByText('92.5');
      expect(scores.length).toBeGreaterThan(0);
    });

    it('should show green styling for high scores (>=80)', () => {
      const breakdown = createMockBreakdown({ finalScore: 85 });

      const { container } = render(<QualityScoreDisplay score={85} breakdown={breakdown} />);

      const badge = container.querySelector('.bg-green-100.text-green-800');
      expect(badge).toBeInTheDocument();
    });

    it('should show yellow styling for medium scores (60-79)', () => {
      const breakdown = createMockBreakdown({ finalScore: 70 });

      const { container } = render(<QualityScoreDisplay score={70} breakdown={breakdown} />);

      const badge = container.querySelector('.bg-yellow-100.text-yellow-800');
      expect(badge).toBeInTheDocument();
    });

    it('should show red styling for low scores (<60)', () => {
      const breakdown = createMockBreakdown({ finalScore: 50 });

      const { container } = render(<QualityScoreDisplay score={50} breakdown={breakdown} />);

      const badge = container.querySelector('.bg-red-100.text-red-800');
      expect(badge).toBeInTheDocument();
    });

    it('should display score label for excellent scores', () => {
      const breakdown = createMockBreakdown({ finalScore: 85 });

      render(<QualityScoreDisplay score={85} breakdown={breakdown} />);

      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should display score label for good scores', () => {
      const breakdown = createMockBreakdown({ finalScore: 70 });

      render(<QualityScoreDisplay score={70} breakdown={breakdown} />);

      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should display score label for fair scores', () => {
      const breakdown = createMockBreakdown({ finalScore: 50 });

      render(<QualityScoreDisplay score={50} breakdown={breakdown} />);

      expect(screen.getByText('Fair')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when compact prop is true', () => {
      const breakdown = createMockBreakdown();

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} compact={true} />);

      // Should show button to expand
      expect(screen.getByRole('button', { name: /Quality score.*Click to expand/ })).toBeInTheDocument();
      // Should not show breakdown initially
      expect(screen.queryByText('Score Breakdown')).not.toBeInTheDocument();
    });

    it('should expand when clicked in compact mode', async () => {
      const user = userEvent.setup();
      const breakdown = createMockBreakdown();

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} compact={true} />);

      const expandButton = screen.getByRole('button', { name: /Quality score.*Click to expand/ });
      await user.click(expandButton);

      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
    });

    it('should collapse when collapse button clicked', async () => {
      const user = userEvent.setup();
      const breakdown = createMockBreakdown();

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} compact={true} />);

      // Expand first
      const expandButton = screen.getByRole('button', { name: /Quality score.*Click to expand/ });
      await user.click(expandButton);
      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();

      // Then collapse
      const collapseButton = screen.getByLabelText('Collapse quality score details');
      await user.click(collapseButton);
      expect(screen.queryByText('Score Breakdown')).not.toBeInTheDocument();
    });

    it('should not render in compact mode by default', () => {
      const breakdown = createMockBreakdown();

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      // Should show breakdown immediately
      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
    });
  });

  describe('Breakdown Display', () => {
    it('should display base score', () => {
      const breakdown = createMockBreakdown({ baseScore: 100 });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Base Score')).toBeInTheDocument();
      expect(screen.getByText('100.0')).toBeInTheDocument();
    });

    it('should display distance penalty when present', () => {
      const breakdown = createMockBreakdown({
        distancePenalty: -5,
        explanations: {
          distance: '150 miles away',
          age: '',
          mileage: '',
          equipment: ''
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Distance Penalty')).toBeInTheDocument();
      expect(screen.getByText('-5.0')).toBeInTheDocument();
    });

    it('should not display distance penalty when zero', () => {
      const breakdown = createMockBreakdown({ distancePenalty: 0 });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.queryByText('Distance Penalty')).not.toBeInTheDocument();
    });

    it('should display age penalty when present', () => {
      const breakdown = createMockBreakdown({
        agePenalty: -4,
        explanations: {
          distance: '',
          age: '2 years difference',
          mileage: '',
          equipment: ''
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Age Penalty')).toBeInTheDocument();
      expect(screen.getByText('-4.0')).toBeInTheDocument();
    });

    it('should display age bonus when present', () => {
      const breakdown = createMockBreakdown({
        ageBonus: 5,
        mileageBonus: 0,
        equipmentBonus: 0,
        explanations: {
          distance: '',
          age: 'Exact year match',
          mileage: '',
          equipment: ''
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Age Match Bonus')).toBeInTheDocument();
      const bonusText = screen.getByText(/\+5\.0/);
      expect(bonusText).toBeInTheDocument();
    });

    it('should display mileage bonus when present', () => {
      const breakdown = createMockBreakdown({
        mileageBonus: 10,
        explanations: {
          distance: '',
          age: '',
          mileage: 'Within 20%',
          equipment: ''
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Mileage Bonus')).toBeInTheDocument();
      expect(screen.getByText('+10.0')).toBeInTheDocument();
    });

    it('should display mileage penalty when present', () => {
      const breakdown = createMockBreakdown({
        mileagePenalty: -10,
        mileageBonus: 0,
        explanations: {
          distance: '',
          age: '',
          mileage: 'High mileage difference',
          equipment: ''
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Mileage Penalty')).toBeInTheDocument();
      expect(screen.getByText('-10.0')).toBeInTheDocument();
    });

    it('should display equipment bonus when present', () => {
      const breakdown = createMockBreakdown({
        equipmentBonus: 15,
        explanations: {
          distance: '',
          age: '',
          mileage: '',
          equipment: 'All equipment matches'
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Equipment Bonus')).toBeInTheDocument();
      expect(screen.getByText('+15.0')).toBeInTheDocument();
    });

    it('should display equipment penalty when present', () => {
      const breakdown = createMockBreakdown({
        equipmentPenalty: -10,
        equipmentBonus: 0,
        explanations: {
          distance: '',
          age: '',
          mileage: '',
          equipment: 'Missing navigation'
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Equipment Penalty')).toBeInTheDocument();
      expect(screen.getByText('-10.0')).toBeInTheDocument();
    });

    it('should display final score', () => {
      const breakdown = createMockBreakdown({ finalScore: 92.5 });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      expect(screen.getByText('Final Score')).toBeInTheDocument();
      // Final score appears twice - once in header, once in breakdown
      const finalScores = screen.getAllByText('92.5');
      expect(finalScores.length).toBeGreaterThan(0);
    });
  });

  describe('Tooltips', () => {
    it('should show tooltip on hover for base score', async () => {
      const breakdown = createMockBreakdown();

      const { container } = render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      // Find the first info icon (for base score)
      const infoIcons = container.querySelectorAll('svg');
      const baseScoreIcon = Array.from(infoIcons).find(icon => 
        icon.parentElement?.classList.contains('cursor-help')
      );
      
      expect(baseScoreIcon).toBeTruthy();
      fireEvent.mouseEnter(baseScoreIcon!.parentElement!);

      await waitFor(() => {
        expect(screen.getByText(/All comparables start with a base score/)).toBeInTheDocument();
      });
    });

    it('should show tooltip with custom explanation for distance', async () => {
      const breakdown = createMockBreakdown({
        distancePenalty: -5,
        explanations: {
          distance: 'Located 150 miles away',
          age: '',
          mileage: '',
          equipment: ''
        }
      });

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      const distanceRow = screen.getByText('Distance Penalty').parentElement!;
      const infoIcon = distanceRow.querySelector('svg')!;
      fireEvent.mouseEnter(infoIcon.parentElement!);

      await waitFor(() => {
        expect(screen.getByText('Located 150 miles away')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const breakdown = createMockBreakdown();

      const { container } = render(<QualityScoreDisplay score={92.5} breakdown={breakdown} />);

      // Find the first info icon (for base score)
      const infoIcons = container.querySelectorAll('svg');
      const baseScoreIcon = Array.from(infoIcons).find(icon => 
        icon.parentElement?.classList.contains('cursor-help')
      );
      
      expect(baseScoreIcon).toBeTruthy();
      fireEvent.mouseEnter(baseScoreIcon!.parentElement!);

      await waitFor(() => {
        expect(screen.getByText(/All comparables start with a base score/)).toBeInTheDocument();
      });

      fireEvent.mouseLeave(baseScoreIcon!.parentElement!);

      await waitFor(() => {
        expect(screen.queryByText(/All comparables start with a base score/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should show checkmark icon for excellent scores', () => {
      const breakdown = createMockBreakdown({ finalScore: 85 });

      const { container } = render(<QualityScoreDisplay score={85} breakdown={breakdown} />);

      // Check for green checkmark icon
      const icon = container.querySelector('.text-green-600');
      expect(icon).toBeInTheDocument();
    });

    it('should show info icon for good scores', () => {
      const breakdown = createMockBreakdown({ finalScore: 70 });

      const { container } = render(<QualityScoreDisplay score={70} breakdown={breakdown} />);

      // Check for yellow info icon
      const icon = container.querySelector('.text-yellow-600');
      expect(icon).toBeInTheDocument();
    });

    it('should show X icon for fair scores', () => {
      const breakdown = createMockBreakdown({ finalScore: 50 });

      const { container } = render(<QualityScoreDisplay score={50} breakdown={breakdown} />);

      // Check for red X icon
      const icon = container.querySelector('.text-red-600');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Complex Breakdown Scenarios', () => {
    it('should display all factors when present', () => {
      const breakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: -5,
        agePenalty: -4,
        ageBonus: 0,
        mileagePenalty: -10,
        mileageBonus: 0,
        equipmentPenalty: -10,
        equipmentBonus: 0,
        finalScore: 71,
        explanations: {
          distance: '150 miles away',
          age: '2 years older',
          mileage: '40% more mileage',
          equipment: 'Missing navigation and sunroof'
        }
      };

      render(<QualityScoreDisplay score={71} breakdown={breakdown} />);

      expect(screen.getByText('Base Score')).toBeInTheDocument();
      expect(screen.getByText('Distance Penalty')).toBeInTheDocument();
      expect(screen.getByText('Age Penalty')).toBeInTheDocument();
      expect(screen.getByText('Mileage Penalty')).toBeInTheDocument();
      expect(screen.getByText('Equipment Penalty')).toBeInTheDocument();
      expect(screen.getByText('Final Score')).toBeInTheDocument();
    });

    it('should handle perfect score scenario', () => {
      const breakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 15,
        finalScore: 125,
        explanations: {
          distance: 'Same location',
          age: 'Same year',
          mileage: 'Within 20%',
          equipment: 'All equipment matches'
        }
      };

      render(<QualityScoreDisplay score={125} breakdown={breakdown} />);

      const scores = screen.getAllByText('125.0');
      expect(scores.length).toBeGreaterThan(0);
      expect(screen.getByText('Mileage Bonus')).toBeInTheDocument();
      expect(screen.getByText('Equipment Bonus')).toBeInTheDocument();
    });

    it('should handle minimal score scenario', () => {
      const breakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: -20,
        agePenalty: -10,
        ageBonus: 0,
        mileagePenalty: -15,
        mileageBonus: 0,
        equipmentPenalty: -10,
        equipmentBonus: 0,
        finalScore: 45,
        explanations: {
          distance: 'Very far',
          age: 'Much older',
          mileage: 'Very high mileage',
          equipment: 'Missing many features'
        }
      };

      render(<QualityScoreDisplay score={45} breakdown={breakdown} />);

      const scores = screen.getAllByText('45.0');
      expect(scores.length).toBeGreaterThan(0);
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for expand button in compact mode', () => {
      const breakdown = createMockBreakdown();

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} compact={true} />);

      expect(screen.getByRole('button', { name: /Quality score 92.5 - Click to expand details/ })).toBeInTheDocument();
    });

    it('should have proper ARIA label for collapse button', async () => {
      const user = userEvent.setup();
      const breakdown = createMockBreakdown();

      render(<QualityScoreDisplay score={92.5} breakdown={breakdown} compact={true} />);

      const expandButton = screen.getByRole('button', { name: /Quality score.*Click to expand/ });
      await user.click(expandButton);

      expect(screen.getByLabelText('Collapse quality score details')).toBeInTheDocument();
    });
  });
});
