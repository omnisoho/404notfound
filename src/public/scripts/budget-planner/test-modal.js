// Test script to verify modal functionality
console.log('Testing modal functionality...');

// Test 1: Check if BudgetPlanner class exists
if (typeof BudgetPlanner === 'undefined') {
    console.error('❌ BudgetPlanner class not found');
} else {
    console.log('✅ BudgetPlanner class loaded');

    // Test 2: Check if modal methods exist
    const testInstance = new BudgetPlanner();

    const methodsToCheck = ['showBudgetModal', 'hideBudgetModal', 'setupModalEventListeners'];
    let methodsExist = true;

    methodsToCheck.forEach(method => {
        if (typeof testInstance[method] !== 'function') {
            console.error(`❌ Method ${method} not found`);
            methodsExist = false;
        } else {
            console.log(`✅ Method ${method} exists`);
        }
    });

    if (methodsExist) {
        console.log('✅ All modal methods are available');

        // Test 3: Check if modal HTML elements exist
        const modalElements = ['budgetModal', 'budgetModalCategories', 'budgetModalClose', 'budgetModalCancel', 'budgetModalSave'];
        let elementsExist = true;

        modalElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`❌ Modal element ${id} not found`);
                elementsExist = false;
            } else {
                console.log(`✅ Modal element ${id} found`);
            }
        });

        if (elementsExist) {
            console.log('✅ All modal HTML elements are present');

            // Test 4: Try to show modal (this will test the basic functionality)
            try {
                testInstance.showBudgetModal();
                console.log('✅ Modal show method executed without errors');

                // Check if modal is visible
                setTimeout(() => {
                    const modal = document.getElementById('budgetModal');
                    if (modal && modal.classList.contains('show')) {
                        console.log('✅ Modal is visible');

                        // Test 5: Check if sliders are created
                        const sliders = document.querySelectorAll('.modal-percentage-slider');
                        if (sliders.length > 0) {
                            console.log(`✅ ${sliders.length} sliders created in modal`);

                            // Test 6: Try slider interaction
                            const firstSlider = sliders[0];
                            const originalValue = firstSlider.value;

                            firstSlider.value = '35';
                            firstSlider.dispatchEvent(new Event('input'));

                            setTimeout(() => {
                                if (firstSlider.value === '35') {
                                    console.log('✅ Slider interaction works');
                                } else {
                                    console.warn('⚠️ Slider interaction may have issues');
                                }

                                // Test 7: Try to hide modal
                                testInstance.hideBudgetModal();
                                setTimeout(() => {
                                    if (!modal.classList.contains('show')) {
                                        console.log('✅ Modal hide method works');
                                        console.log('🎉 All modal tests passed!');
                                    } else {
                                        console.error('❌ Modal hide method failed');
                                    }
                                }, 100);
                            }, 100);
                        } else {
                            console.error('❌ No sliders found in modal');
                        }
                    } else {
                        console.error('❌ Modal did not become visible');
                    }
                }, 100);
            } catch (error) {
                console.error('❌ Error showing modal:', error);
            }
        } else {
            console.error('❌ Some modal HTML elements are missing');
        }
    } else {
        console.error('❌ Some modal methods are missing');
    }
}

// Test double-click functionality
setTimeout(() => {
    const categories = document.querySelectorAll('[data-category]');
    if (categories.length > 0) {
        console.log('✅ Category elements with data-category found');

        // Simulate double-click on first category
        const firstCategory = categories[0];
        const dblclickEvent = new Event('dblclick');
        firstCategory.dispatchEvent(dblclickEvent);

        setTimeout(() => {
            const modal = document.getElementById('budgetModal');
            if (modal && modal.classList.contains('show')) {
                console.log('✅ Double-click opens modal');
            } else {
                console.error('❌ Double-click does not open modal');
            }
        }, 100);
    } else {
        console.log('ℹ️ No category elements found (this is normal for test page)');
    }
}, 500);

console.log('Modal testing complete. Check console for results.');
